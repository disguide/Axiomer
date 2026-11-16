import { describe, expect, it } from "vitest";
import { seedGraph } from "./seed";
import { exportGraph, parseGraph, validateGraph, readGraphFile } from "./io";

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

describe("graph integrity and metadata", () => {
  const pair = {
    nodes: [{ id: "a", type: "claim", content: "Claim" }, { id: "b", type: "support", content: "Reason" }],
    edges: [{ id: "edge", from: "b", to: "a", edgeType: "supports" }],
  };

  it("rejects duplicate node and edge identities", () => {
    expect(() => validateGraph({ ...pair, nodes: [...pair.nodes, pair.nodes[0]] })).toThrow(/Duplicate node/);
    expect(() => validateGraph({ ...pair, edges: [...pair.edges, pair.edges[0]] })).toThrow(/Duplicate edge/);
  });

  it("rejects self-connections, semantic cycles, and children of foundations", () => {
    expect(() => validateGraph({ ...pair, edges: [{ ...pair.edges[0], from: "a" }] })).toThrow(/itself/);
    expect(() => validateGraph({ ...pair, edges: [...pair.edges, { id: "other", from: "a", to: "b", edgeType: "annotates" }] })).toThrow(/circular/);
    expect(() => validateGraph({ ...pair, nodes: [pair.nodes[0], { ...pair.nodes[1], type: "value" }], edges: [{ ...pair.edges[0], from: "a", to: "b" }] })).toThrow(/cannot have children/);
  });

  it("gives readable errors for malformed legacy rows before migration", () => {
    expect(() => validateGraph({ nodes: [null], edges: [] })).toThrow(/nodes\[0\] is not an object/);
    expect(() => validateGraph({ nodes: [], edges: [null] })).toThrow(/edges\[0\] is not an object/);
  });

  it("round-trips URLs, verification, and manual positions and rejects unsafe metadata", () => {
    const graph = { nodes: [{ id: "source", type: "source", content: "A source", url: "https://example.com/page", verified: false, position: { x: -30.5, y: 200 } }], edges: [] };
    expect(parseGraph(JSON.stringify(graph))).toEqual(graph);
    expect(() => validateGraph({ ...graph, nodes: [{ ...graph.nodes[0], url: "javascript:alert(1)" }] })).toThrow(/http or https/);
    expect(() => validateGraph({ ...graph, nodes: [{ ...graph.nodes[0], position: { x: Infinity, y: 0 } }] })).toThrow(/finite/);
    expect(() => validateGraph({ ...graph, nodes: [{ ...graph.nodes[0], verified: "yes" }] })).toThrow(/boolean/);
  });

  it("rejects oversized files before reading them", async () => {
    let read = false;
    const file = { size: 5 * 1024 * 1024 + 1, text: async () => { read = true; return ""; } } as File;
    await expect(readGraphFile(file)).rejects.toThrow(/smaller than 5 MiB/);
    expect(read).toBe(false);
  });

  it("validates a 10,000-thought chain iteratively and rejects oversized inputs", () => {
    const nodes = Array.from({ length: 10_000 }, (_, i) => ({ id: `n${i}`, type: "claim", content: String(i) }));
    const edges = nodes.slice(1).map((node, i) => ({ id: `e${i}`, from: node.id, to: nodes[i].id, edgeType: "supports" }));
    expect(validateGraph({ nodes, edges }).nodes).toHaveLength(10_000);
    expect(() => validateGraph({ nodes: [...nodes, { id: "over", type: "claim", content: "Too many" }], edges })).toThrow(/at most 10,000/);
    expect(() => validateGraph({ nodes: pair.nodes, edges: Array(50_001).fill(pair.edges[0]) })).toThrow(/at most 50,000/);
    expect(() => parseGraph(" ".repeat(5 * 1024 * 1024 + 1))).toThrow(/smaller than 5 MiB/);
  });
});
