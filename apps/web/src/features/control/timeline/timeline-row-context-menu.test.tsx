import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { confirmActionModel } from "@/features/shared/confirm-action-model";
import { system } from "@/features/shared/ui/provider";

import { TimelineRowContextMenu, useTimelineRowContextMenu } from "./timeline-row-context-menu";

const { mutateAsync, openFloatingPanel } = vi.hoisted(() => ({
  mutateAsync: vi.fn(async () => undefined),
  openFloatingPanel: vi.fn(),
}));

afterEach(cleanup);

function renderWithChakra(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

function ContextMenuHarness({ target }: { target: TimelineTableItem }) {
  const { open, state } = useTimelineRowContextMenu();

  return (
    <>
      <button onContextMenu={(event) => open(event, target)} type="button">
        Open menu
      </button>
      <output data-testid="menu-y">{state.y}</output>
    </>
  );
}

vi.mock("@/features/control/hooks", () => ({
  useDeleteTimelineEventMutation: () => ({ mutateAsync }),
}));

vi.mock("@/features/control/floating-panel-model", () => ({
  floatingPanelModel: { openFloatingPanel },
}));

describe("TimelineRowContextMenu", () => {
  function makeTarget(type: TimelineEventType, id = 11): TimelineTableItem {
    return {
      id,
      position: id,
      type,
      placeholderName: type,
      name: type,
      durationSeconds: 1,
      requireManualInteraction: false,
      newTotalScore: 0,
      newRank: 0,
      isActive: false,
    };
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

  test("keeps the two-item menu inside the bottom viewport edge", () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 });

    try {
      render(<ContextMenuHarness target={makeTarget(TimelineEventType.CUS)} />);

      fireEvent.contextMenu(screen.getByRole("button", { name: "Open menu" }), {
        clientX: 20,
        clientY: 190,
      });

      expect(screen.getByTestId("menu-y")).toHaveTextContent("88");
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });

  test("opens the extension config panel when editing a CUS event", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    openFloatingPanel.mockClear();

    renderWithChakra(
      <TimelineRowContextMenu
        state={{
          isOpen: true,
          x: 20,
          y: 20,
          target: makeTarget(TimelineEventType.CUS, 42),
        }}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openFloatingPanel).toHaveBeenCalledWith("extension-config", "Edit Event #42", {
      eventId: 42,
    });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      openFloatingPanel.mock.invocationCallOrder[0],
    );
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
