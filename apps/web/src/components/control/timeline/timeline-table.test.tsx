import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AppProvider } from "@/components/app/provider";

import { ControlTimelineTable } from "./timeline-table";

const hooksMock = vi.hoisted(() => ({
  useControlShowRows: vi.fn(),
  useControlShowQuery: vi.fn(),
  useControlIsLive: vi.fn(),
  useRenameControlEventMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

vi.mock("@/features/control/hooks", () => hooksMock);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ControlTimelineTable", () => {
  test("renders timeline rows from the shared query layer", async () => {
    hooksMock.useControlShowQuery.mockReturnValue({
      data: {
        playback: {
          currentEventId: 2,
        },
      },
      isLoading: false,
      error: null,
    });
    hooksMock.useControlShowRows.mockReturnValue([
      {
        id: 1,
        type: "RES",
        name: "Alice Team",
        placeholderName: "Alice Team",
        problem: "A",
        newScore: 100,
        newRank: 1,
      },
      {
        id: 2,
        type: "SFX",
        name: "Play SFX: sting",
        placeholderName: "Play SFX: sting",
        durationSeconds: 3,
        assetId: "sting",
      },
    ]);
    hooksMock.useControlIsLive.mockReturnValue(true);

    render(
      <AppProvider>
        <ControlTimelineTable />
      </AppProvider>,
    );

    expect(await screen.findByText("Alice Team")).toBeInTheDocument();
    expect(screen.getByText(/sting/)).toBeInTheDocument();
  });

  test("falls back to empty state when no rows exist", async () => {
    hooksMock.useControlShowQuery.mockReturnValue({
      data: {
        playback: {},
      },
      isLoading: false,
      error: null,
    });
    hooksMock.useControlShowRows.mockReturnValue([]);
    hooksMock.useControlIsLive.mockReturnValue(false);

    render(
      <AppProvider>
        <ControlTimelineTable />
      </AppProvider>,
    );

    expect(await screen.findByText("No show loaded.")).toBeInTheDocument();
  });
});
