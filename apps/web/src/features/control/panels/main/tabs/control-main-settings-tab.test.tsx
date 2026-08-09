import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { system } from "@/features/shared/ui/provider";

import { ControlMainSettingsTab } from "./control-main-settings-tab";

vi.mock("@/features/control/hooks", () => ({
  useControlCanMutate: () => true,
  useControlFullAutoEnabled: () => false,
  useControlTickRate: () => undefined,
  useUpdateAutomationMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSettingsMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("ControlMainSettingsTab", () => {
  test("shows the tick-rate select with calculated labels", () => {
    render(
      <ChakraProvider value={system}>
        <ControlMainSettingsTab />
      </ChakraProvider>,
    );
    expect(screen.getByText("Tick rate (fps)")).toBeTruthy();
    expect(screen.getAllByText("60.000").length).toBeGreaterThan(0);
  });
});
