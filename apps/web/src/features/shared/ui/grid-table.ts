export interface GridTableColumnConfig {
  minW?: string;
  maxW?: string;
}

export function gridTableTemplate(
  columns: Record<string, GridTableColumnConfig> | GridTableColumnConfig[],
): string {
  const values = Array.isArray(columns) ? columns : Object.values(columns);
  return values
    .map(({ minW, maxW }) => {
      if (minW && maxW) return `minmax(${minW}, ${maxW})`;
      if (minW) return `minmax(${minW}, 1fr)`;
      if (maxW) return `minmax(0, ${maxW})`;
      return "1fr";
    })
    .join(" ");
}
