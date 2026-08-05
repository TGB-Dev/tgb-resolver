import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  type FloatingPanelHandle,
  floatingPanelModel,
} from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { system } from "@/features/shared/ui/provider";

import { CreateEventPanel } from "./create-event-panel";

vi.mock("@/features/control/hooks", () => ({
  useCreateTimelineEventMutation: () => ({ mutateAsync: vi.fn() }),
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

afterEach(() => {
  cleanup();
  for (const panel of floatingPanelModel.panels.value) panel.close(false);
});

describe("scratch", () => {
  test("selecting MEDIA renders its form without throwing", async () => {
    const user = userEvent.setup();
    render(makeUi(createPanel()));
    await user.click(screen.getByRole("button", { name: "Toggle suggestions" }));
    await user.click(await screen.findByRole("option", { name: /MEDIA - / }));
    expect(screen.getByLabelText("Visual asset")).toBeInTheDocument();
    expect(screen.getByLabelText("Audio asset")).toBeInTheDocument();
  }, 10_000);
});
