import { Table } from "@chakra-ui/react";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import type { FC } from "react";

interface LeaderboardRowProps {
  data: LeaderboardEntry;
}

const LeaderboardRow: FC<LeaderboardRowProps> = ({ data }) => {
  const username = `${data.realName} (${data.username})`;
  return (
    <Table.Row>
      <Table.Cell>{data.rank}</Table.Cell>
      <Table.Cell>{username}</Table.Cell>
      {data.problems.map((problem) => (
        <Table.Cell key={problem.problemId}>{problem.score}</Table.Cell>
      ))}
      <Table.Cell>{data.totalScore}</Table.Cell>
      <Table.Cell>{data.totalPenalty}</Table.Cell>
    </Table.Row>
  );
};

export default LeaderboardRow;
