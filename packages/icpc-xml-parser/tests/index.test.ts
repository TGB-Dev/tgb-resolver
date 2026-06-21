import { expect, test } from "vitest";
import { parseIcpcXml, parseIcpcXmlFile } from "../src";

const SAMPLE_PATH = new URL("sample.xml", import.meta.url).pathname;

test("parses info", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.info.contestId).toBe("contest");
  expect(result.info.title).toBe("Contest");
  expect(result.info.starttime).toBe(1723862700);
  expect(result.info.length).toBe("3:05:00");
  expect(result.info.penalty).toBe(5);
  expect(result.info.started).toBe("True");
  expect(result.info.scoreboardFreezeLength).toBe("0:15:00");
});

test("parses languages", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.language).toHaveLength(20);
  expect(result.language[0]).toMatchObject({ id: 5, key: "C", name: "C" });
});

test("parses regions", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.region).toHaveLength(1);
  expect(result.region[0]).toMatchObject({ externalId: 1, name: "Administrative Site" });
});

test("parses judgements", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.judgement).toHaveLength(11);
  expect(result.judgement[0]).toMatchObject({ acronym: "AC", name: "Accepted" });
});

test("parses problems", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.problem).toHaveLength(6);
  expect(result.problem[0]).toMatchObject({
    id: 1,
    label: "A",
    name: "Thế Giới Âm Nhạc",
    score: 100,
  });
});

test("parses teams", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.team).toHaveLength(54);
  expect(result.team[0]).toMatchObject({
    id: 1,
    externalId: 548,
    name: "Contestant 1",
    username: "CONTEST_1",
    nationality: "VNM",
  });
});

test("parses runs", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.run).toHaveLength(809);
  const firstRun = result.run[0];
  expect(firstRun).toMatchObject({
    id: 3706,
    problem: 6,
    language: "CPP17",
    team: 1,
    judged: "True",
    result: "WA",
    solved: "False",
    penalty: "True",
  });
  expect(firstRun.score).toBe(0);
  expect(firstRun.time).toBeCloseTo(86.632682);
});

test("parses finalized", () => {
  const result = parseIcpcXmlFile(SAMPLE_PATH);
  expect(result.finalized).toBeDefined();
  // biome-ignore lint/style/noNonNullAssertion: guarded by toBeDefined above
  const finalized = result.finalized!;
  expect(finalized.lastGold).toBe(4);
  expect(finalized.lastSilver).toBe(8);
  expect(finalized.lastBronze).toBe(12);
  expect(finalized.comment).toBe("Auto-finalized");
});

test("rejects invalid XML", () => {
  expect(() => parseIcpcXml("<root></root>")).toThrow();
  expect(() => parseIcpcXml("not xml")).toThrow();
});
