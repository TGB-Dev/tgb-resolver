import { ChakraProvider } from "@chakra-ui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { ShowFile, TimelineEvent, TimelineTableItem } from "@tgb-resolver/realtime";
import { PlaybackStatus, ShowMode, ShowSource, TimelineMode } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { playbackModel } from "@/features/control/playback-model";
import { showModel } from "@/features/shared/show-model";
import { ColorModeProvider, useColorMode } from "@/features/shared/ui/color-mode";
import { system } from "@/features/shared/ui/provider";

import { ControlTimelineTable } from "./timeline-table";
import { ControlTimelineTableItem } from "./timeline-table-item";

const {
  mutateAsync,
  openFloatingPanel,
  isLiveMock,
  seekMock,
  moveMock,
  reorderGroupSpy,
  reorderItemSpy,
} = vi.hoisted(() => ({
  mutateAsync: vi.fn(async () => undefined),
  openFloatingPanel: vi.fn(),
  isLiveMock: vi.fn(() => false),
  seekMock: vi.fn(),
  moveMock: vi.fn(),
  reorderGroupSpy: vi.fn(),
  reorderItemSpy: vi.fn(),
}));

vi.mock("@/features/control/hooks", () => ({
  usePatchTimelineEventMutation: () => ({ mutateAsync }),
  useRenameControlEventMutation: () => ({ mutateAsync }),
  useDeleteTimelineEventMutation: () => ({ mutateAsync }),
  useControlShowQuery: () => ({ data: { mode: ShowMode.LIVE }, isLoading: false, error: null }),
  useControlIsLive: () => isLiveMock(),
  useSeekPlaybackMutation: () => ({ mutate: seekMock }),
  useMoveTimelineEventMutation: () => ({ mutate: moveMock }),
}));

vi.mock("@/features/control/floating-panel-model", () => ({
  floatingPanelModel: { openFloatingPanel },
}));

vi.mock("motion/react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("motion/react")>();
  return {
    ...mod,
    Reorder: {
      Group: ({
        children,
        axis: _axis,
        values: _values,
        onReorder: _onReorder,
        ...rest
      }: {
        children?: ReactNode;
        [key: string]: unknown;
      }) => {
        reorderGroupSpy();
        return <ul {...(rest as React.HTMLAttributes<HTMLUListElement>)}>{children}</ul>;
      },
      Item: ({
        children,
        value: _value,
        dragListener: _dragListener,
        dragControls: _dragControls,
        onDragEnd: _onDragEnd,
        ...rest
      }: {
        children?: ReactNode;
        [key: string]: unknown;
      }) => {
        reorderItemSpy();
        return <li {...(rest as React.HTMLAttributes<HTMLLIElement>)}>{children}</li>;
      },
    },
  };
});

afterEach(cleanup);
beforeEach(() => {
  mutateAsync.mockClear();
  openFloatingPanel.mockClear();
  seekMock.mockClear();
  moveMock.mockClear();
  isLiveMock.mockReset();
  reorderGroupSpy.mockClear();
  reorderItemSpy.mockClear();
  playbackModel.reset();
  showModel.hydrateFromSnapshot(makeShow([]));
  localStorage.clear();
});

function makeShow(events: TimelineEvent[]): ShowFile {
  return {
    schemaVersion: 1,
    showVersion: 1,
    mode: ShowMode.EDITING,
    timelineMode: TimelineMode.RW,
    meta: { title: "t", source: ShowSource.MANUAL },
    contest: {
      durationSeconds: 0,
      freezeDurationSeconds: 0,
      problems: [],
      users: [],
      preFreezeSnapshot: [],
    },
    automation: {
      autoResolveEnabled: false,
      autoResolveSpeedMs: 3_000,
      fullAutoEnabled: false,
    },
    playback: { status: PlaybackStatus.IDLE, activeEventIds: [] },
    assets: { items: [] },
    timeline: events,
  };
}

function event(id: number): TimelineEvent {
  return {
    id,
    position: id,
    type: TimelineEventType.CUS,
    payload: { extId: `ext${id}`, extPayload: {} },
  };
}

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

describe("ControlTimelineTable mode-dependent rendering", () => {
  test("live mode: static rows without reorder wrappers, grip buttons, or grip column", () => {
    isLiveMock.mockReturnValue(true);
    showModel.hydrateFromSnapshot(makeShow([event(1), event(2), event(3)]));

    const { container } = renderWithChakra(<ControlTimelineTable />);

    expect(container.querySelectorAll("ul > li[data-timeline-row]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-event-id]")).toHaveLength(3);

    expect(reorderGroupSpy).not.toHaveBeenCalled();
    expect(reorderItemSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Drag to reorder event" })).toBeNull();

    const grids = Array.from(container.querySelectorAll<HTMLElement>("div")).filter(
      (el) => getComputedStyle(el).gridTemplateColumns !== "none",
    );
    expect(grids.length).toBe(4);
    for (const grid of grids) {
      expect(getComputedStyle(grid).gridTemplateColumns).not.toContain("3ch");
    }
  });

  test("edit mode: reorder wrappers, grip buttons, and grip column rendered", () => {
    isLiveMock.mockReturnValue(false);
    showModel.hydrateFromSnapshot(makeShow([event(1), event(2), event(3)]));

    const { container } = renderWithChakra(<ControlTimelineTable />);

    expect(container.querySelectorAll("ul > li[data-timeline-row]")).toHaveLength(3);
    expect(reorderGroupSpy).toHaveBeenCalledTimes(1);
    expect(reorderItemSpy).toHaveBeenCalledTimes(3);
    expect(screen.getAllByRole("button", { name: "Drag to reorder event" })).toHaveLength(3);

    const grids = Array.from(container.querySelectorAll<HTMLElement>("div")).filter(
      (el) => getComputedStyle(el).gridTemplateColumns !== "none",
    );
    expect(grids.length).toBe(4);
    for (const grid of grids) {
      expect(getComputedStyle(grid).gridTemplateColumns).toContain("minmax(3ch, 3ch)");
    }
  });
});
