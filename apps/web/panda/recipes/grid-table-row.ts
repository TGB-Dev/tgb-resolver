import { defineRecipe } from "@pandacss/dev";

// Grid-based table row (see AGENTS.md "Grid over Table"): a list of CSS grid
// rows instead of an HTML <table>, scoping reflows to individual rows.
// Cells are `position: relative` only; do NOT give them a positive z-index --
// the FloatingPanel positioner carries an inline `z-index: stackIndex + 1`
// (about 1) from Zag, so any docked/high z-index here would paint the timeline
// above open panels. Cell-vs-indicator layering falls to DOM order instead.
export const gridTableRowRecipe = defineRecipe({
  className: "grid-table-row",
  base: {
    display: "grid",
    w: "full",
    columnGap: 2,
    minH: 8,
    alignItems: "center",
    "& > *": { alignItems: "center", position: "relative" },
  },
});
