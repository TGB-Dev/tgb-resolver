import { ChakraProvider } from "@chakra-ui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { system } from "@/features/shared/ui/provider";

import { ControlTimelineTableItem } from "./timeline-table-item";

const { mutateAsync, openFloatingPanel } = vi.hoisted(() => ({
  mutateAsync: vi.fn(async () => undefined),
  openFloatingPanel: vi.fn(),
}));

vi.mock("@/features/control/hooks", () => ({
  usePatchTimelineEventMutation: () => ({ mutateAsync }),
  useRenameControlEventMutation: () => ({ mutateAsync }),
}));

vi.mock("@/features/control/floating-panel-model", () => ({
  floatingPanelModel: { openFloatingPanel },
}));

afterEach(cleanup);
beforeEach(() => {
  mutateAsync.mockClear();
  openFloatingPanel.mockClear();
  playbackModel.reset();
});

function renderWithChakra(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe("ControlTimelineTable", () => {
  function makePayload(): TimelineTableItem {
    return {
      id: 11,
      position: 1,
      type: TimelineEventType.CUS,
      placeholderName: "Custom event",
      name: "Custom event",
      durationSeconds: 1,
      triggerOffsetSeconds: 3,
      requireManualInteraction: false,
      newTotalScore: 0,
      newRank: 0,
      isActive: false,
    };
  }

  test("toggles manual interaction when its full-width cell is double-clicked", () => {
    renderWithChakra(
      <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />,
    );

    fireEvent.doubleClick(screen.getByRole("button", { name: "Toggle manual interaction" }));

    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 11, requireManualInteraction: true });
  });

  test("opens the extension config panel when a non-editable row cell is double-clicked", () => {
    renderWithChakra(
      <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />,
    );

    fireEvent.doubleClick(screen.getByText("UNK"));

    expect(openFloatingPanel).toHaveBeenCalledWith("extension-config", "Edit Event #1", {
      eventId: 11,
    });
  });

  test("does not open the extension config panel when an editable cell is double-clicked", () => {
    renderWithChakra(
      <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />,
    );

    fireEvent.doubleClick(screen.getByText("+3"));

    expect(openFloatingPanel).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("clearing trigger offset sends an explicit clear request", async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />,
    );

    fireEvent.doubleClick(screen.getByText("+3"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 11, clearTriggerOffset: true });
  });

  test("shows the current-event highlight on the current row only", async () => {
    const { container } = renderWithChakra(
      <div className="light">
        <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />
      </div>,
    );

    const row = container.querySelector("[data-event-id='11']") as HTMLElement;
    const border = container.querySelector("[data-testid='current-event-border']") as HTMLElement;
    expect(row).not.toBeNull();
    expect(border).not.toBeNull();

    const unhighlightedClass = border.className;
    expect(row.style.color).toBe("");

    act(() => playbackModel.update({ currentEventId: 11 }));

    await waitFor(() => expect(row.style.color).toBe("var(--chakra-colors-fg-inverted)"));
    expect(border.className).not.toBe(unhighlightedClass);

    act(() => playbackModel.update({ currentEventId: 99 }));

    await waitFor(() => expect(row.style.color).toBe(""));
    expect(border.className).toBe(unhighlightedClass);
  });
});
