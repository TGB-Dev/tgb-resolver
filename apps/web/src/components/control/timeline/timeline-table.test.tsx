import { cleanup, render, screen } from "@testing-library/react";
import { createEmptyShow } from "@tgb-resolver/contracts";
import { afterEach, describe, expect, test } from "vitest";

import { AppProvider } from "@/components/app/provider";
import { appStore, controlShowAtom, resetControlStateForTests } from "@/state/control";

import { ControlTimelineTable } from "./timeline-table";

afterEach(() => {
  cleanup();
});

describe("ControlTimelineTable", () => {
  test("renders timeline rows from the shared Jotai store", async () => {
    resetControlStateForTests();
    appStore.set(
      controlShowAtom,
      createEmptyShow({
        mode: "live",
        timeline: [
          {
            id: 1,
            type: "RES",
            payload: {
              realName: "Alice Team",
              username: "alice",
              problem: "A",
              newScore: 100,
              newRank: 1,
            },
          },
          {
            id: 2,
            type: "SFX",
            payload: {
              sfxId: "sting",
              durationSeconds: 3,
            },
          },
        ],
      }),
    );

    render(
      <AppProvider>
        <ControlTimelineTable />
      </AppProvider>,
    );

    expect(await screen.findByText("Alice Team")).toBeInTheDocument();
    expect(screen.getByText(/sting/)).toBeInTheDocument();
  });

  test("falls back to the placeholder name when customName is cleared", async () => {
    resetControlStateForTests();
    appStore.set(
      controlShowAtom,
      createEmptyShow({
        timeline: [
          {
            id: 1,
            type: "RES",
            customName: "",
            payload: {
              realName: "Alice Team",
              username: "alice",
              problem: "A",
              newScore: 100,
              newRank: 1,
            },
          },
        ],
      }),
    );

    render(
      <AppProvider>
        <ControlTimelineTable />
      </AppProvider>,
    );

    expect(await screen.findByText("Alice Team")).toBeInTheDocument();
  });
});
