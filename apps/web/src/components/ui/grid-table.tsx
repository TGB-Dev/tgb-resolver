import { Grid, type GridProps } from "@chakra-ui/react";

interface GridTableColumnConfig {
  minW?: string;
  maxW?: string;
}

function gridTableTemplate(
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

function GridTableRow({ children, ...props }: GridProps) {
  return (
    <Grid
      w="full"
      gapX={2}
      minH={8}
      alignItems="center"
      css={{ "& > *": { zIndex: 10, alignItems: "center" } }}
      {...props}
    >
      {children}
    </Grid>
  );
}

export type { GridTableColumnConfig };
export { GridTableRow, gridTableTemplate };
