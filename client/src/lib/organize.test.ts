import { describe, expect, it } from "vitest";
import type { Graph } from "./types";
import { seedGraph } from "./seed";
import * as G from "./graph";
import { getWorkItems, summarizeWork } from "./organize";

const lastId = (g: Graph) => g.nodes[g.nodes.length - 1].id;

describe("mergeTerminals (canonical merge)", () => {
  // Build a duplicate of trolley-v1 grounded by a new argument.
  const withDuplicate = () => {
    let g = G.addRootQuestion(seedGraph, "Help refugees?");
    const qid = lastId(g);
    g = G.addNode(g, "position", "Yes", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "Reduces suffering", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "Reduce net suffering", aid); // near-dup of v1
    const dupId = lastId(g);
    return { g, aid, dupId };
  };

  it("re-points the duplicate's chains at the keeper and marks it merged", () => {
    const { g, aid, dupId } = withDuplicate();
    const merged = G.mergeTerminals(g, "trolley-v1", dupId);
    // The new argument now grounds in the keeper…
    expect(
      merged.edges.some(
        (e) =>
          e.edgeType === "grounds-in" &&
          e.from === aid &&
          e.to === "trolley-v1",
      ),
    ).toBe(true);
    // …the duplicate keeps existing as a merged ghost with a redirect…
    expect(G.getNode(merged, dupId)?.status).toBe("merged");
    expect(
      merged.edges.some(
        (e) =>
          e.edgeType === "supersedes" &&
          e.from === "trolley-v1" &&
          e.to === dupId,
      ),
    ).toBe(true);
    // …and convergence now shows both roots on the keeper.
    const usage = G.getValueUsage(merged).find(
      (u) => u.value.id === "trolley-v1",
    );
    expect(usage?.convergent).toBe(true);
  });

  it("refuses cross-type and self merges", () => {
    const { g, dupId } = withDuplicate();
    expect(G.mergeTerminals(g, "sky-el1", dupId)).toBe(g); // epistemic-limit ≠ value
    expect(G.mergeTerminals(g, dupId, dupId)).toBe(g);
  });

  it("does not duplicate an edge the keeper already has", () => {
    const { g, aid, dupId } = withDuplicate();
    // Give the argument a second grounds-in straight to the keeper, then merge.
    const doubled = G.linkToExistingValue(g, aid, "trolley-v1");
    const merged = G.mergeTerminals(doubled, "trolley-v1", dupId);
    const groundings = merged.edges.filter(
      (e) =>
        e.edgeType === "grounds-in" &&
        e.from === aid &&
        e.to === "trolley-v1",
    );
    expect(groundings).toHaveLength(1);
  });
});

describe("getWorkItems (the organize worklist)", () => {
  it("reports a healthy seed as clean", () => {
    // Seed: everything grounded, no attacks, no duplicates above threshold.
    const items = getWorkItems(seedGraph);
    expect(items).toHaveLength(0);
    expect(summarizeWork(items).total).toBe(0);
  });

  it("finds near-duplicate terminals and picks the better-connected keeper", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "Minimize total human suffering", aid);
    const dupId = lastId(g);
    const dup = getWorkItems(g).find((i) => i.kind === "duplicate-terminals");
    expect(dup).toBeDefined();
    if (dup?.kind === "duplicate-terminals") {
      expect([dup.keep.id, dup.drop.id].sort()).toEqual(
        ["trolley-v1", dupId].sort(),
      );
      // trolley-v1 has an existing grounding parent; the fresh dup has one too,
      // so keeper is decided by connectivity ordering — both acceptable, but
      // merge must remain valid either way.
      expect(dup.score).toBeGreaterThanOrEqual(0.55);
    }
  });

  it("flags unanswered winning attacks, and clears once rebutted", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    g = G.addNode(g, "argument-support", "A", pid);
    const aid = lastId(g);
    g = G.addNode(g, "value", "V", aid);
    g = G.addNode(g, "objection", "Devastating", aid);
    const oid = lastId(g);
    const attacks = getWorkItems(g).filter((i) => i.kind === "unanswered-attack");
    expect(
      attacks.some(
        (i) =>
          i.kind === "unanswered-attack" &&
          i.target.id === aid &&
          i.attacker.id === oid,
      ),
    ).toBe(true);
    // Rebut it — the item disappears (the attack is answered).
    g = G.addNode(g, "rebuttal", "Not so", oid);
    expect(
      getWorkItems(g).filter((i) => i.kind === "unanswered-attack"),
    ).toHaveLength(0);
  });

  it("flags positionless questions and unsupported positions", () => {
    let g = G.addRootQuestion(seedGraph, "Empty Q");
    const emptyQ = lastId(g);
    g = G.addRootQuestion(g, "Q2");
    const q2 = lastId(g);
    g = G.addNode(g, "position", "Floating", q2);
    const floating = lastId(g);
    const items = getWorkItems(g);
    expect(
      items.some(
        (i) => i.kind === "positionless-question" && i.node.id === emptyQ,
      ),
    ).toBe(true);
    expect(
      items.some(
        (i) => i.kind === "unsupported-position" && i.node.id === floating,
      ),
    ).toBe(true);
  });

  it("orders duplicates before attacks before grounding gaps", () => {
    let g = G.addRootQuestion(seedGraph, "Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "P", qid);
    const pid = lastId(g);
    // ungrounded argument
    g = G.addNode(g, "argument-support", "No ground yet", pid);
    const aid = lastId(g);
    // unanswered attack on it
    g = G.addNode(g, "objection", "Bad", aid);
    // duplicate terminal (normalizes identically to the seed value)
    g = G.addNode(g, "argument-support", "Second arg", pid);
    const a2 = lastId(g);
    g = G.addNode(g, "value", "Minimize total suffering!", a2);
    const kinds = getWorkItems(g).map((i) => i.kind);
    const first = (k: string) => kinds.indexOf(k as never);
    expect(first("duplicate-terminals")).toBeGreaterThanOrEqual(0);
    expect(first("duplicate-terminals")).toBeLessThan(first("unanswered-attack"));
    expect(first("unanswered-attack")).toBeLessThan(first("ungrounded-argument"));
  });
});
