import { ChakraProvider } from "@chakra-ui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { ColorModeProvider, useColorMode } from "@/features/shared/ui/color-mode";
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
  localStorage.clear();
});

function renderWithChakra(ui: ReactNode) {
  return render(
    <ChakraProvider value={system}>
      <ColorModeProvider>{ui}</ColorModeProvider>
    </ChakraProvider>,
  );
}

function ColorModeToggle({ children }: { children: ReactNode }) {
  const { setColorMode } = useColorMode();
  return (
    <>
      <button type="button" onClick={() => setColorMode("light")}>
        light
      </button>
      <button type="button" onClick={() => setColorMode("dark")}>
        dark
      </button>
      {children}
    </>
  );
}

describe("ControlTimelineTable", () => {
  function makePayload(id = 11): TimelineTableItem {
    return {
      id,
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

  test("shows the current-event highlight on the current row only and tracks theme changes", async () => {
    const { container } = renderWithChakra(
      <ColorModeToggle>
        <ControlTimelineTableItem payload={makePayload()} isLive={false} onSeek={() => {}} />
        <ControlTimelineTableItem payload={makePayload(22)} isLive={false} onSeek={() => {}} />
      </ColorModeToggle>,
    );

    const row = container.querySelector("[data-event-id='11']") as HTMLElement;
    const otherRow = container.querySelector("[data-event-id='22']") as HTMLElement;
    const borders = container.querySelectorAll("[data-testid='current-event-border']");
    const rowBorder = borders[0] as HTMLElement;
    const otherBorder = borders[1] as HTMLElement;
    expect(row).not.toBeNull();
    expect(otherRow).not.toBeNull();
    expect(rowBorder).not.toBeNull();
    expect(otherBorder).not.toBeNull();

    const unhighlightedClass = rowBorder.className;
    expect(otherBorder.className).toBe(unhighlightedClass);
    expect(row.style.color).toBe("");
    expect(otherRow.style.color).toBe("");

    act(() => playbackModel.update({ currentEventId: 11 }));

    await waitFor(() => expect(rowBorder.className).not.toBe(unhighlightedClass));
    // dark mode is the default: the current row keeps the inherited text color
    expect(row.style.color).toBe("");
    expect(otherBorder.className).toBe(unhighlightedClass);
    expect(otherRow.style.color).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "light" }));

    await waitFor(() => expect(row.style.color).toBe("var(--chakra-colors-fg-inverted)"));
    expect(otherRow.style.color).toBe("");
    expect(otherBorder.className).toBe(unhighlightedClass);

    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    await waitFor(() => expect(row.style.color).toBe(""));
    expect(rowBorder.className).not.toBe(unhighlightedClass);

    act(() => playbackModel.update({ currentEventId: 22 }));

    await waitFor(() => expect(rowBorder.className).toBe(unhighlightedClass));
    expect(row.style.color).toBe("");
    expect(otherRow.style.color).toBe("");
  });
});
