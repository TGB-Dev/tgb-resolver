import { Table, Text } from "@chakra-ui/react";
import { memo } from "react";

import { useIsBigScreen } from "./leaderboard-provider";

interface RankCellProps {
  rank: number;
}

export const RankCell = memo(({ rank }: RankCellProps) => {
  const isBigScreen = useIsBigScreen().value;

  return (
    <Table.Cell>
      <Text fontFamily="mono" fontSize={isBigScreen ? "3xl" : undefined} textAlign="end">
        {rank}
      </Text>
    </Table.Cell>
  );
});
