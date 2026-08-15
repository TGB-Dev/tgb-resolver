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

const imageExtensionLabel = "IMG - Showing fullscreen image in the audience view.";
const mediaExtensionLabel = "MED - Play an image, video, or audio asset in the audience view.";
const scrollerExtensionLabel =
  "SCR - Auto-scrolls the leaderboard from top to bottom over a set duration.";

const { createTimelineEvent } = vi.hoisted(() => ({
  createTimelineEvent: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/features/control/hooks", () => ({
  useCreateTimelineEventMutation: () => ({ mutateAsync: createTimelineEvent }),
}));

vi.mock("@/features/extensions/media/duration", () => ({
  computeMediaExtensionDuration: vi.fn(async () => 3.25),
}));

vi.mock("@/features/extensions/scroller/duration", () => ({
  computeScrollerExtensionDuration: vi.fn(() => 11),
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
        .map((extension) => `${extension.shortName} - ${extension.description}`),
    );

    await user.click(await screen.findByRole("option", { name: imageExtensionLabel }));

    expect(screen.getByLabelText("Asset")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Fit Mode" })).toHaveTextContent("Cover");
    expect(screen.getByLabelText("Asset").closest("form")).toHaveStyle({ gap: "1rem" });
  }, 10_000);

  test("creates an Image event with the selected asset name and closes the panel", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    const close = vi.spyOn(panel, "close");
    render(makeUi(panel));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: imageExtensionLabel }));
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
    await user.click(await screen.findByRole("option", { name: imageExtensionLabel }));
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
    await user.click(await screen.findByRole("option", { name: imageExtensionLabel }));
    await user.type(screen.getByLabelText("Asset"), "asset-1");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTimelineEvent).toHaveBeenCalledTimes(1));
    view.rerender(makeUi(panel));
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
  });

  test("creates a Media event with an auto-computed durationSeconds", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    const close = vi.spyOn(panel, "close");
    render(makeUi(panel));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: mediaExtensionLabel }));
    await user.type(screen.getByLabelText("Visual asset"), "asset-1");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createTimelineEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 3.25,
          custom: expect.objectContaining({ extId: "media" }),
        }),
      ),
    );
    await waitFor(() => expect(close).toHaveBeenCalledWith(true));
  });

  test("creates a Scroller event with an auto-computed durationSeconds", async () => {
    const user = userEvent.setup();
    const panel = createPanel();
    const close = vi.spyOn(panel, "close");
    render(makeUi(panel));

    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: scrollerExtensionLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createTimelineEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 11,
          custom: expect.objectContaining({ extId: "scroller" }),
        }),
      ),
    );
    await waitFor(() => expect(close).toHaveBeenCalledWith(true));
  });
});
