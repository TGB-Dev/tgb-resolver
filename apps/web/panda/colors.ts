import tailwindColors from "tailwindcss/colors";

// tailwindcss/colors (v4) already ships true OKLCH values (e.g. `oklch(62.3% 0.214 259.815)`).
// Black/white are exported as hex, so we map them to their OKLCH equivalents to stay consistent.
// `inherit`/`current`/`transparent` are kept from the Chakra preset (along with `whiteAlpha`/
// `blackAlpha`, which the dialog backdrop relies on).
const rawTailwindColors = ((tailwindColors as { default?: unknown }).default ??
  tailwindColors) as Record<string, string | Record<string, string>>;

type ColorScale = Record<string, { value: string }>;
type ColorTokens = Record<string, { value: string } | ColorScale>;

function buildTailwindColorTokens(): ColorTokens {
  const result: ColorTokens = {};
  for (const [name, value] of Object.entries(rawTailwindColors)) {
    if (typeof value === "string") {
      if (name === "black") result.black = { value: "oklch(0% 0 0)" };
      else if (name === "white") result.white = { value: "oklch(100% 0 0)" };
      // inherit / current / transparent -> kept from the preset
      continue;
    }
    const scale: ColorScale = {};
    for (const [shade, shadeValue] of Object.entries(value)) {
      scale[shade] = { value: shadeValue };
    }
    result[name] = scale;
  }
  return result;
}

export const colorTokens: ColorTokens = buildTailwindColorTokens();
