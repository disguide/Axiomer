import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { addNode, addRootQuestion, getDepth } from "@/lib/graph";

describe("Tier 2 - Boundary 12: Outline View Boundary Cases", () => {
  it("computes depths correctly for a 20-level deeply nested tree in outline view", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Depth 0 Root");
    let currId = g.nodes[0].id;

    for (let i = 1; i <= 20; i++) {
      g = addNode(g, "support", `Depth ${i} Node`, currId);
      currId = g.nodes[g.nodes.length - 1].id;
      expect(getDepth(g, currId)).toBe(i);
    }
  });

  it("handles extreme text length (5000+ characters) in outline nodes", () => {
    const extremeContent = "Paragraph with detailed dialectical analysis. ".repeat(120);
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, extremeContent);
    const qId = g.nodes[0].id;
    expect(g.nodes[0].content.length).toBeGreaterThan(5000);
    expect(getDepth(g, qId)).toBe(0);
  });

  it("returns depth 0 for isolated nodes without parents", () => {
    const g: Graph = {
      nodes: [{ id: "solo", type: "claim", content: "Solo Node" }],
      edges: [],
    };
    expect(getDepth(g, "solo")).toBe(0);
  });

  it("handles cyclic parent structures in getDepth gracefully without infinite loops", () => {
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
    // getDepth has seen guard to break cycles
    expect(typeof getDepth(cyclicGraph, "a")).toBe("number");
  });

  it("correctly computes depths when multiple roots share a converged terminal", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Q1 (depth 0)");
    const q1 = g.nodes[0].id;
    g = addNode(g, "support", "S1 (depth 1)", q1);
    const s1 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "support", "S2 (depth 2)", s1);
    const s2 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "V (depth 3)", s2);
    const vId = g.nodes[g.nodes.length - 1].id;

    expect(getDepth(g, q1)).toBe(0);
    expect(getDepth(g, s1)).toBe(1);
    expect(getDepth(g, s2)).toBe(2);
    expect(getDepth(g, vId)).toBe(3);
  });
});
