import { ChakraProvider } from "@chakra-ui/react";
import { signal } from "@preact/signals-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type TimelineEvent, TimelineEventType } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { showModel } from "@/features/shared/show-model";
import { system } from "@/features/shared/ui/provider";

import { ExtensionConfigPanel } from "./config-panel";
import { usePatchExtensionPayload } from "./patch";

vi.mock("./patch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./patch")>();
  return { ...actual, usePatchExtensionPayload: vi.fn() };
});

vi.mock("./media/duration", () => ({
  computeMediaExtensionDuration: vi.fn(async () => 6.5),
}));

const imageEvent: TimelineEvent = {
  id: 7,
  position: 1,
  type: TimelineEventType.CUS,
  payload: { extId: "img", extPayload: { assetId: "asset-1", fit: "cover" } },
};

const mediaEvent: TimelineEvent = {
  id: 8,
  position: 2,
  type: TimelineEventType.CUS,
  payload: { extId: "media", extPayload: { assetId: "asset-1", audioAssetId: "" } },
};

const queryClient = new QueryClient();
const patchPayload = vi.fn();

function createPanel(): FloatingPanelHandle {
  return {
    id: "panel-1",
    type: FloatingPanelType.InspectShow,
    title: signal("Config"),
    props: signal({}),
    result: Promise.resolve(true),
    isDirty: signal(false),
    isSaving: signal(false),
    setTitle: vi.fn(),
    setDirty: vi.fn(),
    setSaving: vi.fn(),
    requestClose: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(),
  } as unknown as FloatingPanelHandle;
}

function makeUi(panel: FloatingPanelHandle): ReactNode {
  return (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <ExtensionConfigPanel panel={panel} eventId={imageEvent.id} />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  showModel.showEvents.value = { [imageEvent.id]: imageEvent };
  patchPayload.mockReset();
  patchPayload.mockResolvedValue(undefined);
  vi.mocked(usePatchExtensionPayload).mockReturnValue(patchPayload);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExtensionConfigPanel", () => {
  test("renders the config form seeded from extPayload", () => {
    render(makeUi(createPanel()));

    expect(screen.getByLabelText("Asset")).toHaveValue("asset-1");
    expect(screen.getByRole("combobox", { name: "Fit Mode" })).toHaveTextContent("Cover");
  });

  test("saving patches the full merged payload and closes the panel", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    render(makeUi(panel));

    await user.click(screen.getByRole("combobox", { name: "Fit Mode" }));
    await user.click(screen.getByRole("option", { name: "Contain" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(panel.close).toHaveBeenCalledWith(true));
    expect(patchPayload).toHaveBeenCalledWith(imageEvent.id, "img", {
      assetId: "asset-1",
      fit: "contain",
    });
  });

  test("surfaces patch errors without closing the panel", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    patchPayload.mockRejectedValue(new Error("boom"));
    const view = render(makeUi(panel));

    await user.click(screen.getByRole("combobox", { name: "Fit Mode" }));
    await user.click(screen.getByRole("option", { name: "Contain" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(panel.close).not.toHaveBeenCalled());
    view.rerender(makeUi(panel));
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  test("shows an empty state when the event is not a CUS event", () => {
    showModel.showEvents.value = {
      [imageEvent.id]: { ...imageEvent, type: TimelineEventType.RES } as unknown as TimelineEvent,
    };
    render(makeUi(createPanel()));

    expect(screen.getByText("No configuration available")).toBeInTheDocument();
  });

  test("shows an empty state when the extension has no config form", () => {
    showModel.showEvents.value = {
      [imageEvent.id]: { ...imageEvent, payload: { extId: "unknown-ext" } },
    };
    render(makeUi(createPanel()));

    expect(screen.getByText('Extension "unknown-ext" has no config form.')).toBeInTheDocument();
  });

  test("saving a Media event passes an auto-computed durationSeconds to patch", async () => {
    showModel.showEvents.value = { [mediaEvent.id]: mediaEvent };
    const user = userEvent.setup();
    const panel = createPanel();
    render(
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <ExtensionConfigPanel panel={panel} eventId={mediaEvent.id} />
        </QueryClientProvider>
      </ChakraProvider>,
    );

    await user.type(screen.getByLabelText("Visual asset"), "asset-2");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(panel.close).toHaveBeenCalledWith(true));
    expect(patchPayload).toHaveBeenCalledWith(mediaEvent.id, "media", expect.any(Object), 6.5);
  });
});
