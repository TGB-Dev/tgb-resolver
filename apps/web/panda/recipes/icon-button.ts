import { defineRecipe } from "@pandacss/dev";

// Square icon-only button overrides, composed with the generated `button`
// recipe at call sites (`cx(button({ size }), iconButton())`). The preset has
// no `iconButton` recipe, so the square shape and icon sizing live here
// instead of a wrapper component.
export const iconButtonRecipe = defineRecipe({
  className: "icon-button",
  base: {
    px: 0,
    py: 0,
    aspectRatio: "1",
    _icon: { fontSize: "1.2em" },
  },
});
