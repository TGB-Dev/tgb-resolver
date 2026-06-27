import { type X2jOptions, XMLParser } from "fast-xml-parser";

import type { RawFeedContest } from "./types";
import { readFileSync } from "node:fs";

// For fast regex-less camelize routine
const upper = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
  h: "H",
  i: "I",
  j: "J",
  k: "K",
  l: "L",
  m: "M",
  n: "N",
  o: "O",
  p: "P",
  q: "Q",
  r: "R",
  s: "S",
  t: "T",
  u: "U",
  v: "V",
  w: "W",
  x: "X",
  y: "Y",
  z: "Z",
} as Record<string, string>;

/**
 * Converts a string to camelCase.
 * @param key the string to convert
 * @returns the camelCase string
 */
function toCamel(key: string): string {
  let out = "";
  let cap = false;

  for (const ch of key) {
    if (ch === "-") cap = true;
    else {
      out += cap ? (upper[ch] ?? ch) : ch;
      cap = false;
    }
  }

  return out;
}

/**
 * Converts the keys of an object to camelCase.
 * @param obj the object to convert
 * @returns the object with camelCase keys
 */
function camelizeKeys<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[toCamel(key)] = obj[key];
  }
  return result as T;
}

/**
 * Set of XML paths that should be parsed as arrays, even if they contain only one element.
 */
const ARRAY_TAGS = new Set([
  "contest.language",
  "contest.region",
  "contest.judgement",
  "contest.problem",
  "contest.team",
  "contest.run",
]);

/**
 * Options for XML parser
 */
const PARSER_OPTIONS: Partial<X2jOptions> = {
  isArray: (_tagName: string, jPath: unknown) => ARRAY_TAGS.has(jPath as string),
  trimValues: true,
  ignoreDeclaration: true,
};

/**
 * Checks if a value is a record (plain object).
 * @param value the value to check
 * @returns true if the value is a record, false otherwise
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parse an ICPC XML string and return the contest data.
 * @param xml the XML string
 * @returns the parsed raw contest data
 */
export function parseIcpcXml(xml: string): RawFeedContest {
  const parser = new XMLParser(PARSER_OPTIONS);
  const parsed = parser.parse(xml);

  if (!isRecord(parsed)) {
    throw new Error("Failed to parse XML: empty result");
  }

  const contest = parsed.contest;

  if (!isRecord(contest) || !isRecord(contest.info)) {
    throw new Error("Failed to parse XML: missing or invalid <contest> root element");
  }

  return {
    info: camelizeKeys(contest.info),
    language: (contest.language as Record<string, unknown>[]).map(camelizeKeys),
    region: (contest.region as Record<string, unknown>[]).map(camelizeKeys),
    judgement: (contest.judgement as Record<string, unknown>[]).map(camelizeKeys),
    problem: (contest.problem as Record<string, unknown>[]).map(camelizeKeys),
    team: (contest.team as Record<string, unknown>[]).map(camelizeKeys),
    run: contest.run as RawFeedContest["run"],
    finalized: contest.finalized
      ? camelizeKeys(contest.finalized as Record<string, unknown>)
      : undefined,
  } as RawFeedContest;
}

/**
 * Parse an ICPC XML file and return the contest data.
 * @param path the path to the ICPC XML file
 * @returns the parsed raw contest data
 */
export function parseIcpcXmlFile(path: string): RawFeedContest {
  const xml = readFileSync(path, "utf-8");
  return parseIcpcXml(xml);
}
