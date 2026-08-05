import { ChakraProvider } from "@chakra-ui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldDataType } from "@tgb-form/core";
import type { ReactRendererProps } from "@tgb-form/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { system } from "@/features/shared/ui/provider";

import { sharedRendererRegistry } from "./renderers";

function rendererFor(type: FieldDataType) {
  return sharedRendererRegistry.byType[type] as unknown as ComponentType<ReactRendererProps>;
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    name: "field",
    field: { state: { value: null }, handleChange: vi.fn() },
    form: { Field: () => null, handleSubmit: () => undefined },
    label: "Field",
    description: undefined,
    props: undefined,
    value: null,
    errors: [],
    ...overrides,
  } as unknown as ReactRendererProps;
}

const StringRenderer = rendererFor(FieldDataType.String);
const NumberRenderer = rendererFor(FieldDataType.Number);
const BooleanRenderer = rendererFor(FieldDataType.Boolean);
const UnsupportedRenderer = rendererFor(FieldDataType.Object);

function renderWithChakra(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

afterEach(() => {
  cleanup();
});

describe("sharedRendererRegistry", () => {
  test("StringRenderer renders the value and writes changed strings", () => {
    const handleChange = vi.fn();
    renderWithChakra(
      <StringRenderer
        {...baseProps({ field: { state: { value: "hello" }, handleChange }, label: "Name" })}
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("hello");

    fireEvent.change(input, { target: { value: "world" } });
    expect(handleChange).toHaveBeenCalledWith("world");
  });

  test("NumberRenderer renders the value and writes parsed numbers", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    renderWithChakra(
      <NumberRenderer
        {...baseProps({ field: { state: { value: 10 }, handleChange }, label: "Duration (s)" })}
      />,
    );

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue("10");

    await user.clear(input);
    await user.type(input, "25");
    expect(handleChange).toHaveBeenLastCalledWith(25);
  });

  test("NumberRenderer does not write NaN when the field is cleared", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    renderWithChakra(
      <NumberRenderer
        {...baseProps({ field: { state: { value: 10 }, handleChange }, label: "Duration (s)" })}
      />,
    );

    await user.clear(screen.getByRole("spinbutton"));

    expect(handleChange).not.toHaveBeenCalled();
  });

  test("BooleanRenderer reflects the value", () => {
    renderWithChakra(
      <BooleanRenderer
        {...baseProps({
          field: { state: { value: true }, handleChange: vi.fn() },
          label: "Auto-hide",
        })}
      />,
    );

    expect(screen.getByText("Auto-hide").closest("label")).toHaveAttribute("data-state", "checked");
  });

  test("BooleanRenderer renders unchecked when value is false", () => {
    renderWithChakra(
      <BooleanRenderer
        {...baseProps({
          field: { state: { value: false }, handleChange: vi.fn() },
          label: "Loop",
        })}
      />,
    );

    expect(screen.getByText("Loop").closest("label")).toHaveAttribute("data-state", "unchecked");
  });

  test("UnsupportedRenderer flags nested Object/Array fields as read-only", () => {
    renderWithChakra(<UnsupportedRenderer {...baseProps({ label: "nested" })} />);

    expect(
      screen.getByText(/nested Object\/Array fields are not yet editable/),
    ).toBeInTheDocument();
  });
});
