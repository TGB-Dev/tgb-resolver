import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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
      <ControlTimelineTableItem
        payload={makePayload()}
        isCurrent={false}
        isLive={false}
        onSeek={() => {}}
      />,
    );

    fireEvent.doubleClick(screen.getByRole("button", { name: "Toggle manual interaction" }));

    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 11, requireManualInteraction: true });
  });

  test("opens the extension config panel when a custom event row is double-clicked", () => {
    renderWithChakra(
      <ControlTimelineTableItem
        payload={makePayload()}
        isCurrent={false}
        isLive={false}
        onSeek={() => {}}
      />,
    );

    fireEvent.doubleClick(screen.getByText("Custom event"));

    expect(openFloatingPanel).toHaveBeenCalledWith("extension-config", "Edit Event #1", {
      eventId: 11,
    });
  });

  test("clearing trigger offset sends an explicit clear request", async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <ControlTimelineTableItem
        payload={makePayload()}
        isCurrent={false}
        isLive={false}
        onSeek={() => {}}
      />,
    );

    fireEvent.doubleClick(screen.getByText("+3"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 11, clearTriggerOffset: true });
  });
});
