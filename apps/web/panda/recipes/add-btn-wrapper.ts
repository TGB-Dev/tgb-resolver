import { defineRecipe } from "@pandacss/dev";

// The "+ event" buttons that float at the top/bottom edge of a timeline row.
// `position` picks which edge (and the matching border rounding). Rows carry
// the `group` class, so visibility is driven by `_groupHover`: hidden until
// the row is hovered. Parity-based background uses `_groupOdd`/`_groupEven`
// so the buttons inherit the row's even/odd striping.
export const addBtnWrapperRecipe = defineRecipe({
  className: "add-btn-wrapper",
  base: {
    position: "absolute",
    right: 0,
    zIndex: 20,
    opacity: 0,
    pointerEvents: "none",
    transitionProperty: "opacity",
    transitionDuration: "0.15s",
    transitionTimingFunction: "swiftOut",
    _groupOdd: { bg: "bg.subtle" },
    _groupEven: { bg: "bg.muted" },
    _groupHover: {
      opacity: 1,
      pointerEvents: "auto",
      _hover: { bg: "bg.emphasized", color: "fg" },
    },
  },
  variants: {
    position: {
      before: {
        top: 0,
        transform: "translateY(-100%)",
        borderTopRadius: "md",
        borderBottomRadius: 0,
      },
      after: {
        bottom: 0,
        transform: "translateY(100%)",
        borderTopRadius: 0,
        borderBottomRadius: "md",
      },
    },
  },
  defaultVariants: { position: "before" },
});
