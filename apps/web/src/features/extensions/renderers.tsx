import {
  Checkbox,
  Field,
  Input,
  NumberInput,
  Select,
  Text,
  useListCollection,
} from "@chakra-ui/react";
import { FieldDataType } from "@tgb-form/core";
import { createReactRendererRegistry, type ReactRendererProps } from "@tgb-form/react";

import { AssetSelectorRenderer } from "./components/asset-selector-renderer";

function validationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}

function FieldErrorText({ errors }: { errors: readonly unknown[] }) {
  if (errors.length === 0) return null;
  return (
    <Text color="fg.error" fontSize="sm">
      {errors.map(validationErrorMessage).join(", ")}
    </Text>
  );
}

function StringRenderer({ field, label, description, props, errors }: ReactRendererProps) {
  return (
    <Field.Root w="full">
      {label && <Field.Label>{label}</Field.Label>}
      <Input
        w="full"
        value={typeof field.state.value === "string" ? field.state.value : ""}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={typeof props?.placeholder === "string" ? props.placeholder : undefined}
      />
      {description && <Field.HelperText>{description}</Field.HelperText>}
      <FieldErrorText errors={errors} />
    </Field.Root>
  );
}

function NumberRenderer({ field, label, description, props, errors }: ReactRendererProps) {
  return (
    <Field.Root w="full">
      {label && <Field.Label>{label}</Field.Label>}
      <NumberInput.Root
        w="full"
        value={typeof field.state.value === "number" ? String(field.state.value) : ""}
        min={typeof props?.min === "number" ? props.min : undefined}
        max={typeof props?.max === "number" ? props.max : undefined}
        step={typeof props?.step === "number" ? props.step : 1}
        onValueChange={(details) => {
          if (Number.isFinite(details.valueAsNumber)) field.handleChange(details.valueAsNumber);
        }}
      >
        <NumberInput.Input />
        <NumberInput.Control>
          <NumberInput.IncrementTrigger />
          <NumberInput.DecrementTrigger />
        </NumberInput.Control>
      </NumberInput.Root>
      {description && <Field.HelperText>{description}</Field.HelperText>}
      <FieldErrorText errors={errors} />
    </Field.Root>
  );
}

function BooleanRenderer({ field, label, errors }: ReactRendererProps) {
  return (
    <Field.Root w="full">
      <Checkbox.Root
        checked={Boolean(field.state.value)}
        onCheckedChange={(details) => {
          if (typeof details.checked === "boolean") field.handleChange(details.checked);
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        {label && <Checkbox.Label>{label}</Checkbox.Label>}
      </Checkbox.Root>
      <FieldErrorText errors={errors} />
    </Field.Root>
  );
}

function SelectInput({ field, label, description, props, errors }: ReactRendererProps) {
  const options = Array.isArray(props?.options)
    ? props.options.filter(
        (option): option is { value: string; label: string } =>
          typeof option === "object" &&
          option !== null &&
          typeof option.value === "string" &&
          typeof option.label === "string",
      )
    : [];
  const { collection } = useListCollection({ initialItems: options });
  const value = typeof field.state.value === "string" ? field.state.value : "";
  return (
    <Field.Root w="full">
      <Field.Label>{label}</Field.Label>
      <Select.Root
        collection={collection}
        value={value ? [value] : []}
        onValueChange={(details) => field.handleChange(details.value[0] ?? "")}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select an option" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((option) => (
              <Select.Item item={option} key={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      {description && <Field.HelperText>{description}</Field.HelperText>}
      <FieldErrorText errors={errors} />
    </Field.Root>
  );
}

function UnsupportedRenderer({ label }: ReactRendererProps) {
  return (
    <Text color="fg.muted" fontSize="sm">
      {label}: nested Object/Array fields are not yet editable.
    </Text>
  );
}

export const sharedRendererRegistry = createReactRendererRegistry({
  byName: {
    "asset-selector": AssetSelectorRenderer,
    "select-input": SelectInput,
  },
  byType: {
    [FieldDataType.String]: StringRenderer,
    [FieldDataType.Number]: NumberRenderer,
    [FieldDataType.Boolean]: BooleanRenderer,
    [FieldDataType.Object]: UnsupportedRenderer,
    [FieldDataType.Array]: UnsupportedRenderer,
  },
});
