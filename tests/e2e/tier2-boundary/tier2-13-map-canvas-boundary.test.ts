import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { getAncestors, getDescendantIds } from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

describe("Tier 2 - Boundary 13: Map Canvas Layout Boundary Cases", () => {
  it("computes dagre layout for an empty graph returning empty position record", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    const positions = layoutGraph(emptyGraph);
    expect(positions).toEqual({});
  });

  it("computes dagre layout for a single isolated node without errors", () => {
    const singleNodeGraph: Graph = {
      nodes: [{ id: "solo", type: "claim", content: "Solo" }],
      edges: [],
    };
    const positions = layoutGraph(singleNodeGraph);
    expect(positions["solo"]).toBeDefined();
    expect(typeof positions["solo"].x).toBe("number");
    expect(typeof positions["solo"].y).toBe("number");
  });

  it("computes dagre layout for a wide graph with 50 sibling roots", () => {
    const nodes = [];
    for (let i = 0; i < 50; i++) {
      nodes.push({ id: `root_${i}`, type: "claim" as const, content: `Root ${i}` });
    }
    const wideGraph: Graph = { nodes, edges: [] };
    const positions = layoutGraph(wideGraph);
    expect(Object.keys(positions)).toHaveLength(50);
  });

  it("computes getAncestors on a cyclic graph without infinite recursion", () => {
    const cyclicGraph: Graph = {
      nodes: [
        { id: "a", type: "claim", content: "A" },
        { id: "b", type: "claim", content: "B" },
      ],
      edges: [
        { id: "e1", from: "b", to: "a", edgeType: "supports" },
        { id: "e2", from: "a", to: "b", edgeType: "supports" },
      ],
    };
    const ancestors = getAncestors(cyclicGraph, "a");
    expect(ancestors.has("b")).toBe(true);
  });

  it("computes getDescendantIds on a cyclic graph without infinite recursion", () => {
    const cyclicGraph: Graph = {
      nodes: [
        { id: "a", type: "claim", content: "A" },
        { id: "b", type: "claim", content: "B" },
      ],
      edges: [
        { id: "e1", from: "b", to: "a", edgeType: "supports" },
        { id: "e2", from: "a", to: "b", edgeType: "supports" },
      ],
    };
    const descendants = getDescendantIds(cyclicGraph, "a");
    expect(descendants.has("a")).toBe(true);
    expect(descendants.has("b")).toBe(true);
  });
});
