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
});
