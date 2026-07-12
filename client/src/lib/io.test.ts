import { describe, expect, it } from "vitest";
import { seedGraph } from "./seed";
import { exportGraph, parseGraph, validateGraph } from "./io";

describe("graph import/export", () => {
  it("round-trips the seed graph", () => {
    const restored = parseGraph(exportGraph(seedGraph));
    expect(restored).toEqual(seedGraph);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseGraph("{ not json")).toThrow(/invalid JSON/);
  });

  it("rejects a bad node type", () => {
    const bad = JSON.stringify({
      nodes: [{ id: "n1", type: "banana", content: "x" }],
      edges: [],
    });
    expect(() => parseGraph(bad)).toThrow(/not a valid NodeType/);
  });

  it("rejects a bad edge type", () => {
    const bad = JSON.stringify({
      nodes: [
        { id: "a", type: "question", content: "q" },
        { id: "b", type: "position", content: "p" },
      ],
      edges: [{ id: "e", from: "b", to: "a", edgeType: "loves" }],
    });
    expect(() => parseGraph(bad)).toThrow(/not a valid EdgeType/);
  });

  it("rejects an edge pointing at a missing node", () => {
    const bad = JSON.stringify({
      nodes: [{ id: "a", type: "question", content: "q" }],
      edges: [{ id: "e", from: "ghost", to: "a", edgeType: "answers" }],
    });
    expect(() => parseGraph(bad)).toThrow(/has no node/);
  });

  it("rejects non-array nodes/edges", () => {
    expect(() => validateGraph({ nodes: {}, edges: [] })).toThrow(
      /nodes must be an array/,
    );
  });

  it("round-trips v2 fields: status, facets, proof standard, edge strength", () => {
    const g = {
      nodes: [
        {
          id: "q",
          type: "question",
          content: "Q?",
          proofStandard: "beyond-reasonable-doubt",
        },
        {
          id: "p",
          type: "position",
          content: "P",
          contentKind: "normative",
          status: "retracted",
          statusMeta: { by: "author", at: "2026-07-11T00:00:00Z", reason: "withdrawn" },
        },
        {
          id: "a",
          type: "argument-support",
          content: "A",
          schemeTag: "expert-opinion",
        },
      ],
      edges: [
        { id: "e1", from: "p", to: "q", edgeType: "answers" },
        { id: "e2", from: "a", to: "p", edgeType: "argues-for", strength: "strong" },
      ],
    };
    const restored = parseGraph(JSON.stringify(g));
    expect(restored).toEqual(g);
  });

  it("accepts every v2 node and edge type", () => {
    const good = JSON.stringify({
      nodes: [
        { id: "q", type: "question", content: "q" },
        { id: "pre", type: "presupposition", content: "x" },
        { id: "w", type: "warrant", content: "w" },
        { id: "imp", type: "implication", content: "i" },
        { id: "ce", type: "counter-example", content: "c" },
        { id: "syn", type: "synthesis", content: "s" },
      ],
      edges: [
        { id: "e1", from: "q", to: "pre", edgeType: "presupposes" },
        { id: "e2", from: "w", to: "imp", edgeType: "undercuts" },
        { id: "e3", from: "ce", to: "imp", edgeType: "contradicts" },
        { id: "e4", from: "syn", to: "q", edgeType: "supersedes" },
      ],
    });
    expect(() => parseGraph(good)).not.toThrow();
  });

  it("rejects a bad status / contentKind / strength", () => {
    const badStatus = JSON.stringify({
      nodes: [{ id: "a", type: "question", content: "q", status: "zombie" }],
      edges: [],
    });
    expect(() => parseGraph(badStatus)).toThrow(/not a valid NodeStatus/);
    const badKind = JSON.stringify({
      nodes: [{ id: "a", type: "position", content: "p", contentKind: "vibes" }],
      edges: [],
    });
    expect(() => parseGraph(badKind)).toThrow(/not a valid ContentKind/);
    const badStrength = JSON.stringify({
      nodes: [
        { id: "a", type: "question", content: "q" },
        { id: "b", type: "position", content: "p" },
      ],
      edges: [
        { id: "e", from: "b", to: "a", edgeType: "answers", strength: "vibes" },
      ],
    });
    expect(() => parseGraph(badStrength)).toThrow(/not a valid InferenceStrength/);
  });
});
