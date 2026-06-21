/**
 * Inferred from tests/sample.xml (a processed XML file from real contest event feed)
 */

export interface RawFeedInfo {
  contestId: string;
  title: string;
  starttime: number;
  length: string;
  penalty: number;
  started: string;
  scoreboardFreezeLength: string;
}

export interface RawFeedLanguage {
  id: number;
  key: string;
  name: string;
}

export interface RawFeedRegion {
  externalId: number;
  name: string;
}

export interface RawFeedJudgement {
  acronym: string;
  name: string;
}

export interface RawFeedProblem {
  id: number;
  label: string;
  name: string;
  score: number;
}

export interface RawFeedTeam {
  id: number;
  externalId: number;
  name: string;
  username: string;
  nationality: string;
  region: string;
  university: string;
}

export interface RawFeedRun {
  id: number;
  problem: number;
  language: string;
  team: number;
  timestamp: number;
  time: number;
  judged: string;
  result: string;
  solved: string;
  score: number;
  penalty: string;
}

export interface RawFeedFinalized {
  lastGold: number;
  lastSilver: number;
  lastBronze: number;
  comment: string;
  timestamp: number;
}

export interface RawFeedContest {
  info: RawFeedInfo;
  language: RawFeedLanguage[];
  region: RawFeedRegion[];
  judgement: RawFeedJudgement[];
  problem: RawFeedProblem[];
  team: RawFeedTeam[];
  run: RawFeedRun[];
  finalized?: RawFeedFinalized;
}
