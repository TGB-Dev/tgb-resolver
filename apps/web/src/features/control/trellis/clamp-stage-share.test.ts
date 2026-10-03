import type { LayoutDocument, LayoutNode } from "@danfessler/trellis";
import { describe, expect, it } from "vitest";

import { clampStageShare, MIN_STAGE_SHARE } from "./clamp-stage-share";

function panel(id: string): LayoutNode {
  return { kind: "panel", id, views: [], selected: "" };
}

function stage(id: string): LayoutNode {
  return { kind: "stage", id };
}

function row(id: string, weights: number[], children: LayoutNode[]): LayoutNode {
  return { kind: "split", id, axis: "x", weights, children };
}

function column(id: string, weights: number[], children: LayoutNode[]): LayoutNode {
  return { kind: "split", id, axis: "y", weights, children };
}

function documentWith(root: LayoutNode): LayoutDocument {
  return { schema: 1, root, floating: [], hidden: [], views: {} };
}

function containsStage(node: LayoutNode): boolean {
  if (node.kind === "stage") return true;
  if (node.kind === "split") return node.children.some(containsStage);
  return false;
}

/** Multiplies the width share of every row split on the path to the stage. */
function widthOf(document: LayoutDocument): number {
  let share = 1;
  const walk = (node: LayoutNode | null): void => {
    if (!node || node.kind === "panel") return;
    if (node.kind === "stage" || !containsStage(node)) return;
    const total = node.weights.reduce((a, b) => a + b, 0);
    node.children.forEach((child, index) => {
      if (!containsStage(child)) return;
      if (node.axis === "x") share *= (node.weights[index] ?? 0) / total;
      walk(child);
    });
  };
  walk(document.root);
  return share;
}

function clamped(document: LayoutDocument, fraction: number): LayoutDocument {
  const result = clampStageShare(document, fraction);
  expect(result).not.toBeNull();
  if (!result) throw new Error("expected a clamped document");
  return result;
}

describe("clampStageShare", () => {
  it("leaves a compliant layout untouched", () => {
    const document = documentWith(row("root", [0.45, 0.55], [panel("main"), stage("stage")]));
    expect(clampStageShare(document, 0.55)).toBeNull();
  });

  it("accepts a share within epsilon of the floor", () => {
    const document = documentWith(row("root", [0.6, 0.4], [panel("main"), stage("stage")]));
    expect(clampStageShare(document, MIN_STAGE_SHARE - 0.0004)).toBeNull();
  });

  it("bumps a squeezed stage back to the floor", () => {
    const document = documentWith(row("root", [0.7, 0.3], [panel("main"), stage("stage")]));
    const fixed = clamped(document, 0.3);
    expect(widthOf(fixed)).toBeCloseTo(MIN_STAGE_SHARE, 6);
    expect(widthOf(document)).toBeCloseTo(0.3, 6);
  });

  it("climbs through a column split without touching it", () => {
    const inner = column("col", [0.5, 0.5], [stage("stage"), panel("side")]);
    const document = documentWith(row("root", [0.7, 0.3], [panel("main"), inner]));
    const fixed = clamped(document, 0.3);
    expect(widthOf(fixed)).toBeCloseTo(MIN_STAGE_SHARE, 6);
    const fixedInner = (fixed.root as Extract<LayoutNode, { kind: "split" }>).children[1];
    expect(fixedInner?.kind).toBe("split");
    if (fixedInner?.kind === "split") {
      expect(fixedInner.weights).toEqual([0.5, 0.5]);
    }
  });

  it("takes nearly all of a nested row when the parent is narrow", () => {
    const inner = row("inner", [0.5, 0.5], [panel("side"), stage("stage")]);
    const document = documentWith(row("root", [0.7, 0.3], [panel("main"), inner]));
    expect(widthOf(clamped(document, 0.15))).toBeCloseTo(MIN_STAGE_SHARE, 3);
  });

  it("returns null when there is no stage", () => {
    const document = documentWith(row("root", [0.5, 0.5], [panel("a"), panel("b")]));
    expect(clampStageShare(document, 0.1)).toBeNull();
  });
});
