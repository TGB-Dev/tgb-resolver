export interface TgbFormInstance {
  values: Record<string, unknown>;
  setValue(name: string, value: unknown): void;
}
export function createTgbFormInstance(initial: Record<string, unknown> = {}): TgbFormInstance {
  const values = { ...initial };
  return {
    values,
    setValue(name, value) {
      values[name] = value;
    },
  };
}
