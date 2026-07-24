import { Table } from "@chakra-ui/react";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import type { FC, ReactNode } from "react";

interface LeaderboardTableProps {
  problems: ProblemDefinition[] | undefined;
  children: ReactNode;
}

const LeaderboardTable: FC<LeaderboardTableProps> = ({ problems, children }) => {
  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Rank</Table.ColumnHeader>
          <Table.ColumnHeader>User</Table.ColumnHeader>

          {problems?.map((problem) => (
            <Table.ColumnHeader key={problem.id}>{problem.label}</Table.ColumnHeader>
          ))}

          <Table.ColumnHeader>Score</Table.ColumnHeader>
          <Table.ColumnHeader>Penalty</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>

      <Table.Body>{children}</Table.Body>
    </Table.Root>
  );
};

export default LeaderboardTable;
