import { Table, Text, VStack } from "@chakra-ui/react";
import { memo, useMemo } from "react";

interface UsernameCellProps {
  username: string;
  realName: string;
}

export const UsernameCell = memo(({ realName, username }: UsernameCellProps) => (
  <Table.Cell maxW="30ch">
    <VStack alignItems="start" gap={2}>
      <Text>{realName}</Text>
      <Text fontFamily="mono" fontStyle="italic">
        {username}
      </Text>
    </VStack>
  </Table.Cell>
));

interface ScoreCellProps {
  score: number;
}

export const ScoreCell = memo(({ score }: ScoreCellProps) => (
  <Table.Cell fontFamily="mono" textAlign="end">
    {score}
  </Table.Cell>
));

interface PenaltyCellProps {
  penalty: number;
}

export const PenaltyCell = memo(({ penalty }: PenaltyCellProps) => (
  <Table.Cell fontFamily="mono" textAlign="end">
    {penalty}
  </Table.Cell>
));

interface SubmissionTimeCellProps {
  submissionTimeSinceStartMs: number;
}

export const SubmissionTimeCell = memo(
  ({ submissionTimeSinceStartMs }: SubmissionTimeCellProps) => {
    const timeString = useMemo(() => {
      const seconds = Math.floor(submissionTimeSinceStartMs / 1000) % 60;
      const minutes = Math.floor(submissionTimeSinceStartMs / (1000 * 60)) % 60;
      const hours = Math.floor(submissionTimeSinceStartMs / (1000 * 60 * 60));

      return `${hours.toString().padStart(1, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, [submissionTimeSinceStartMs]);

    return (
      <Table.Cell fontFamily="mono" fontWeight="bold" fontStyle="italic" textAlign="end">
        {timeString}
      </Table.Cell>
    );
  },
);
