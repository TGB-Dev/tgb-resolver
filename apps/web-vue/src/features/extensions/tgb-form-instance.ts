interface TgbFormInstanceInput {
  readonly Field: object;
  readonly handleSubmit: () => void | Promise<void>;
}

export function toTgbFormInstance(form: TgbFormInstanceInput): Record<string, unknown> {
  return { Field: form.Field, handleSubmit: () => form.handleSubmit() };
}
