import { Checkbox, Field, Input, NumberInput, Text } from "@chakra-ui/react";
import { FieldDataType } from "@tgb-form/core";
import { createReactRendererRegistry, type ReactRendererProps } from "@tgb-form/react";

function FieldErrorText({ errors }: { errors: readonly unknown[] }) {
  if (errors.length === 0) return null;
  return (
    <Text color="fg.error" fontSize="sm">
      {errors.map(String).join(", ")}
    </Text>
  );
}

function StringRenderer({ field, label, description, props, errors }: ReactRendererProps) {
  return (
    <Field.Root>
      {label && <Field.Label>{label}</Field.Label>}
      <Input
        value={String(field.state.value ?? "")}
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
    <Field.Root>
      {label && <Field.Label>{label}</Field.Label>}
      <NumberInput.Root
        value={String(field.state.value ?? "")}
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
    <Field.Root>
      <Checkbox.Root
        checked={Boolean(field.state.value)}
        onCheckedChange={(details) => field.handleChange(details.checked === true)}
      >
        <Checkbox.Control />
        {label && <Checkbox.Label>{label}</Checkbox.Label>}
      </Checkbox.Root>
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
  byType: {
    [FieldDataType.String]: StringRenderer,
    [FieldDataType.Number]: NumberRenderer,
    [FieldDataType.Boolean]: BooleanRenderer,
    [FieldDataType.Object]: UnsupportedRenderer,
    [FieldDataType.Array]: UnsupportedRenderer,
  },
});
