import { Center, Grid, Table, Text } from "@chakra-ui/react";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";

import { useIsBigScreen } from "./leaderboard-provider";

interface LeaderboardTableProps {
  problems: ProblemDefinition[] | undefined;
  children: ReactNode;
}

export function LeaderboardTable({ problems, children }: LeaderboardTableProps) {
  const isBigScreen = useIsBigScreen().value;

  return (
    <Table.Root
      size={isBigScreen ? "lg" : "sm"}
      stickyHeader
      css={{
        "& *": isBigScreen && {
          fontSize: "2xl",
          lineHeight: "tall",
        },
        borderCollapse: "separate",
        borderSpacing: 0,
      }}
    >
      <Table.Header
        css={{
          "& th": {
            borderBottomWidth: 2,
            borderBottomColor: "border",
          },
        }}
        position="relative"
        zIndex={999}
      >
        <Table.Row
          css={{
            "& th": {
              borderBottomWidth: 2,
              borderBottomColor: "border",
            },
          }}
        >
          <Table.ColumnHeader textAlign="end">Rank</Table.ColumnHeader>
          <Table.ColumnHeader>User</Table.ColumnHeader>

          {problems?.map((problem) => (
            <Table.ColumnHeader key={problem.id} w={isBigScreen ? 56 : "8ch"} maxH={8} h={8}>
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
            </Table.ColumnHeader>
          ))}

          <Table.ColumnHeader textAlign="end">Score</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Penalty</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Time</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>

      <Table.Body>{children}</Table.Body>
    </Table.Root>
  );
}
