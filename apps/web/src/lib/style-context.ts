import { createContext } from "@ark-ui/vue";

export type SlotRecipeRuntime<T> = (props?: T) => Record<string, string>;

export function createStyleContext<T extends Record<string, unknown>>(
  recipe: SlotRecipeRuntime<T>,
) {
  const [StylesProvider, useStyles] = createContext<ReturnType<typeof recipe>>("StylesProvider");

  const useRecipe = (props?: T) => recipe(props);

  return { StylesProvider, useStyles, useRecipe };
}
