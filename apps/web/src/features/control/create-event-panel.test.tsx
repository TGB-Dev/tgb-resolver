import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";
import {
  type FloatingPanelHandle,
  floatingPanelModel,
} from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { extensionRegistry } from "@/features/extensions";
import { system } from "@/features/shared/ui/provider";

import { CreateEventPanel } from "./create-event-panel";

const { createTimelineEvent } = vi.hoisted(() => ({
  createTimelineEvent: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/features/control/hooks", () => ({
  useCreateTimelineEventMutation: () => ({ mutateAsync: createTimelineEvent }),
}));

function createPanel(): FloatingPanelHandle {
  return floatingPanelModel.openFloatingPanel(FloatingPanelType.CreateEvent, "Create event", {
    relativeToEventId: 42,
    before: true,
  });
}

function makeUi(panel: FloatingPanelHandle): ReactNode {
  return (
    <ChakraProvider value={system}>
      <CreateEventPanel panel={panel} relativeToEventId={42} before />
    </ChakraProvider>
  );
}

beforeEach(() => {
  createTimelineEvent.mockReset();
  createTimelineEvent.mockResolvedValue(undefined);
  (assetsManagerModel.allFiles as { value: unknown }).value = [
    {
      id: "asset-1",
      name: "hero.png",
      isDirectory: false,
    },
  ];
});

afterEach(() => {
  cleanup();
  for (const panel of floatingPanelModel.panels.value) {
    panel.close(false);
  }
  (assetsManagerModel.allFiles as { value: unknown }).value = [];
});

describe("CreateEventPanel", () => {
  test("only offers extensions with config forms and renders Image defaults when selected", async () => {
    const user = userEvent.setup();
    render(makeUi(createPanel()));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(
      extensionRegistry.extensionList
        .filter((extension) => extension.configForm)
        .map((extension) => extension.shortName),
    );

    await user.click(await screen.findByRole("option", { name: "IMG" }));

    expect(screen.getByLabelText("Asset")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Fit Mode" })).toHaveTextContent("Cover");
  }, 10_000);

  test("creates an Image event with the selected asset name and closes the panel", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    const close = vi.spyOn(panel, "close");
    render(makeUi(panel));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: "IMG" }));
    await user.type(screen.getByLabelText("Asset"), "asset-1");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createTimelineEvent).toHaveBeenCalledWith({
        relativeToEventId: 42,
        before: true,
        customName: "hero.png",
        custom: { extId: "img", extPayload: { assetId: "asset-1", fit: "cover" } },
      }),
    );
    await waitFor(() => expect(close).toHaveBeenCalledWith(true));
  });

  test("validates required image fields before submitting", async () => {
    const user = userEvent.setup();
    render(makeUi(createPanel()));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: "IMG" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Asset is required")).toBeInTheDocument();
    expect(createTimelineEvent).not.toHaveBeenCalled();
  });

  test("renders mutation errors without closing the panel", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    const close = vi.spyOn(panel, "close");
    createTimelineEvent.mockRejectedValue(new Error("boom"));
    const view = render(makeUi(panel));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: "IMG" }));
    await user.type(screen.getByLabelText("Asset"), "asset-1");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTimelineEvent).toHaveBeenCalledTimes(1));
    view.rerender(makeUi(panel));
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
  });
});
