export interface FloatingPanelSize {
  width: number;
  height: number;
}

export interface FloatingPanelPosition {
  x: number;
  y: number;
}

export function getDefaultFloatingPanelPosition(
  size: FloatingPanelSize,
  viewport: FloatingPanelSize,
): FloatingPanelPosition {
  return {
    x: Math.max(0, (viewport.width - size.width) / 2),
    y: Math.max(0, (viewport.height - size.height) / 2),
  };
}
