export const CHAKRA_SPACE_BASE_PX = 4;

export const CONTROL_TIMELINE_ROW_HEIGHT_PX = 32;

export function pxToChakraSpace(px: number) {
  if (px % CHAKRA_SPACE_BASE_PX !== 0) {
    throw new Error(`Expected a Chakra spacing multiple of ${CHAKRA_SPACE_BASE_PX}px, got ${px}px`);
  }

  return px / CHAKRA_SPACE_BASE_PX;
}
