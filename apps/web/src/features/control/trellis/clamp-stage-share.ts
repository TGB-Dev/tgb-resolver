import type { LayoutDocument, LayoutNode } from "@danfessler/trellis";

export const MIN_STAGE_SHARE = 0.4;
const COMPLIANCE_EPSILON = 0.0005;

function childNodes(node: LayoutNode): LayoutNode[] {
  if (node.kind === "split") return node.children;
  if (node.kind === "stage") return node.child ? [node.child] : [];
  return [];
}

function findPath(node: LayoutNode | null, targetId: string): LayoutNode[] | null {
  if (!node) return null;
  if (node.id === targetId) return [node];
  for (const child of childNodes(node)) {
    const path = findPath(child, targetId);
    if (path) return [node, ...path];
  }
  return null;
}

function findStageId(node: LayoutNode | null): string | null {
  if (!node) return null;
  if (node.kind === "stage") return node.id;
  for (const child of childNodes(node)) {
    const found = findStageId(child);
    if (found) return found;
  }
  return null;
}

type SplitNode = Extract<LayoutNode, { kind: "split" }>;

/** Weight of every sibling except the one on the path to the stage. */
function siblingWeight(split: SplitNode, index: number): number {
  return split.children.reduce(
    (sum, _child, childIndex) =>
      childIndex === index ? sum : sum + (split.weights[childIndex] ?? 0),
    0,
  );
}

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return sum > 0 ? weights.map((weight) => weight / sum) : weights;
}

/**
 * Raises the child's weight so the child's share of `split` becomes
 * `required`, leaving siblings in proportion. Returns the achieved share.
 */
function raiseWeight(split: SplitNode, index: number, required: number): number {
  const total = siblingWeight(split, index);
  const nextWeight = required >= 1 ? total * 1e6 : (required * total) / (1 - required);
  split.weights = normalize(
    split.weights.map((weight, weightIndex) => (weightIndex === index ? nextWeight : weight)),
  );
  return nextWeight / (total + nextWeight);
}

function sharesOf(split: SplitNode, index: number): { total: number; share: number } {
  const total = siblingWeight(split, index);
  const current = split.weights[index] ?? 0;
  return { total, share: current / (total + current) };
}

/**
 * Walks the path to the stage, widening each row split whose share of the
 * workspace is under the floor. `accumulated` is the fraction of the
 * workspace width owned by `node` so far.
 */
function clampPath(path: LayoutNode[]): void {
  let accumulated = 1;
  for (let depth = 0; depth < path.length - 1; depth += 1) {
    const split = path[depth];
    const next = path[depth + 1];
    if (split?.kind !== "split" || split.axis !== "x" || !next) continue;
    const index = split.children.indexOf(next);
    if (index < 0) continue;
    const { share } = sharesOf(split, index);
    if (accumulated * share >= MIN_STAGE_SHARE - COMPLIANCE_EPSILON) {
      accumulated *= share;
      continue;
    }
    accumulated *= raiseWeight(split, index, Math.min(MIN_STAGE_SHARE / accumulated, 1));
  }
}

/**
 * Returns a document with the stage guaranteed at least `MIN_STAGE_SHARE` of
 * the workspace width, or null when the document already complies.
 * `stageWidthFraction` is the stage's current world width (0-1), measured by
 * the workspace so pixel minimums and scaling are accounted for.
 */
export function clampStageShare(
  document: LayoutDocument,
  stageWidthFraction: number,
): LayoutDocument | null {
  if (stageWidthFraction >= MIN_STAGE_SHARE - COMPLIANCE_EPSILON) return null;
  const root = document.root;
  if (!root) return null;
  const stageId = findStageId(root);
  if (!stageId) return null;
  const path = findPath(root, stageId);
  if (!path || path.length < 2) return null;

  const cloned: LayoutNode = structuredClone(root);
  const livePath = findPath(cloned, stageId);
  if (!livePath) return null;
  clampPath(livePath);
  return { ...document, root: cloned };
}
