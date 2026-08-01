import { Center, Grid, Table, Text } from "@chakra-ui/react";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import type { CSSProperties, ReactNode } from "react";

import { useIsBigScreen } from "./leaderboard-provider";

const END_ALIGN_STYLE: CSSProperties = { textAlign: "end" };

interface LeaderboardTableProps {
  problems: ProblemDefinition[] | undefined;
  children: ReactNode;
}

export function LeaderboardTable({ problems, children }: LeaderboardTableProps) {
  const isBigScreen = useIsBigScreen().value;

  return (
    <Table.Root
      size={isBigScreen ? "lg" : "sm"}
      native
      stickyHeader
      css={{
        "& *": isBigScreen && {
          fontSize: "2xl",
          lineHeight: "tall",
        },
        borderCollapse: "separate",
        borderSpacing: 0,
        "& thead": {
          position: "relative",
          zIndex: 999,
        },
        "& thead th": {
          borderBottomWidth: 2,
          borderBottomColor: "border",
        },
      }}
    >
      <thead>
        <tr>
          <th style={END_ALIGN_STYLE}>Rank</th>
          <th>User</th>

          {problems?.map((problem) => (
            <th key={problem.id} style={{ width: isBigScreen ? "14rem" : "8ch", height: "2rem" }}>
              {isBigScreen ? (
                <Grid templateRows="1fr 2fr" h="full" gap={2}>
                  <Center>
                    <Text fontFamily="mono">{problem.label}</Text>
                  </Center>
                  <Text textAlign="center" maxW="full" lineClamp={2}>
                    {problem.name}
                  </Text>
                </Grid>
              ) : (
                <Center>
                  <Text fontFamily="mono">{problem.label}</Text>
                </Center>
              )}
            </th>
          ))}

          <th style={END_ALIGN_STYLE}>Score</th>
          <th style={END_ALIGN_STYLE}>Penalty</th>
          <th style={END_ALIGN_STYLE}>Time</th>
        </tr>
      </thead>

      <tbody>{children}</tbody>
    </Table.Root>
  );
}
