import { cva } from "@styled-system/css";

export const folderNodeClass = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    w: "full",
    px: "2",
    py: "1.5",
    fontSize: "sm",
    fontWeight: "normal",
    cursor: "pointer",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    _hover: { bg: "bg.subtle" },
  },
  variants: {
    selected: {
      true: {
        borderLeftColor: "colorPalette.border",
        bg: { base: "bg.muted", _hover: "bg.muted" },
        color: "colorPalette",
      },
    },
    dropTarget: {
      true: {
        borderLeftColor: "colorPalette.border",
        bg: { base: "bg.muted", _hover: "bg.muted" },
      },
    },
  },
});
