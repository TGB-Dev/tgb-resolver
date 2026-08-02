import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { confirmActionModel } from "@/features/shared/confirm-action-model";
import { system } from "@/features/shared/ui/provider";

import { TimelineRowContextMenu } from "./timeline-row-context-menu";

const mutateAsync = vi.fn(async () => undefined);

afterEach(cleanup);

function renderWithChakra(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

vi.mock("@/features/control/hooks", () => ({
  useDeleteTimelineEventMutation: () => ({ mutateAsync }),
}));

describe("TimelineRowContextMenu", () => {
  function makeTarget(type: TimelineEventType, id = 11): TimelineTableItem {
    return {
      id,
      type,
      placeholderName: type,
      durationSeconds: 1,
      requireManualInteraction: false,
      newTotalScore: 0,
      newRank: 0,
    } as unknown as TimelineTableItem;
  }

  test("renders delete item for CUS events", () => {
    renderWithChakra(
      <TimelineRowContextMenu
        state={{
          isOpen: true,
          x: 20,
          y: 20,
          target: makeTarget(TimelineEventType.CUS),
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).not.toBeNull();
  });

  test("does not render for non-CUS events", () => {
    renderWithChakra(
      <TimelineRowContextMenu
        state={{
          isOpen: true,
          x: 20,
          y: 20,
          target: makeTarget(TimelineEventType.RES),
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  test("asks confirm before delete mutation", async () => {
    const user = userEvent.setup();
    mutateAsync.mockClear();
    vi.spyOn(confirmActionModel, "confirmAction").mockResolvedValue(true);

    renderWithChakra(
      <TimelineRowContextMenu
        state={{
          isOpen: true,
          x: 20,
          y: 20,
          target: makeTarget(TimelineEventType.CUS, 42),
        }}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmActionModel.confirmAction).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith(42);
  });

  test("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    mutateAsync.mockClear();
    const confirmAction = vi.spyOn(confirmActionModel, "confirmAction").mockResolvedValue(false);
    confirmAction.mockClear();

    renderWithChakra(
      <TimelineRowContextMenu
        state={{
          isOpen: true,
          x: 20,
          y: 20,
          target: makeTarget(TimelineEventType.CUS, 42),
        }}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
