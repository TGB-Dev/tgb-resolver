import { readFileSync } from "node:fs";
import { parseIcpcXml } from "@tgb-resolver/icpc-xml-parser";
import { describe, expect, test } from "vitest";
import { convertIcpcContestToShow } from "./xml-to-show";

const SAMPLE_XML_PATH = new URL(
  "../../../packages/icpc-xml-parser/tests/sample.xml",
  import.meta.url,
);

describe("convertIcpcContestToShow", () => {
  test("stores contest timing, snapshot, and frozen score-improvement resolves", () => {
    const xml = readFileSync(SAMPLE_XML_PATH, "utf-8");
    const contest = parseIcpcXml(xml);
    const show = convertIcpcContestToShow(contest);

    expect(show.contest.durationSeconds).toBe(3 * 3600 + 5 * 60);
    expect(show.contest.freezeDurationSeconds).toBe(15 * 60);
    expect(show.contest.preFreezeSnapshot).toHaveLength(contest.team.length);
    expect(show.contest.preFreezeSnapshot[0]).toMatchObject({
      teamId: expect.any(Number),
      realName: expect.any(String),
      username: expect.any(String),
      score: expect.any(Number),
      rank: 1,
    });
    expect(show.timeline).toHaveLength(9);
    expect(
      show.timeline.some(
        (event) =>
          event.type === "RES" &&
          event.payload.username === "CONTEST_35" &&
          event.payload.problem === "D",
      ),
    ).toBe(true);
    expect(
      show.timeline.some(
        (event) =>
          event.type === "RES" &&
          event.payload.username === "CONTEST_26" &&
          event.payload.problem === "C",
      ),
    ).toBe(true);
  });
});
