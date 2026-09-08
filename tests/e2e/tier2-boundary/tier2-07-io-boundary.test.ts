import { describe, expect, it } from "vitest";
import type { Graph, GraphEdge, GraphNode } from "@/lib/types";
import { exportGraph, parseGraph, validateGraph } from "@/lib/io";
import { exportGraphToMarkdown } from "@/lib/markdown";

describe("Tier 2 - Boundary 7: JSON & Markdown I/O Boundary Cases", () => {
  it("exports and validates a massive 500-node graph payload without data corruption", () => {
    const nodes: GraphNode[] = [{ id: "root", type: "claim", content: "Root" }];
    const edges: GraphEdge[] = [];
    for (let i = 1; i <= 500; i++) {
      nodes.push({ id: `n_${i}`, type: "support", content: `Content ${i}` });
      edges.push({ id: `e_${i}`, from: `n_${i}`, to: "root", edgeType: "supports" });
    }

    const g: Graph = { nodes, edges };
    const json = exportGraph(g);
    const parsed = parseGraph(json);
    expect(parsed.nodes).toHaveLength(501);
    expect(parsed.edges).toHaveLength(500);
  });

  it("handles extra unknown attributes in node objects safely", () => {
    const jsonWithExtraFields = JSON.stringify({
      nodes: [
        {
          id: "n1",
          type: "claim",
          content: "Claim",
          extraMetaData: { author: "Arthur", score: 99 },
          tags: ["epistemic", "ai"],
        },
      ],
      edges: [],
    });
    const parsed = parseGraph(jsonWithExtraFields);
    expect(parsed.nodes[0].id).toBe("n1");
    expect(parsed.nodes[0].content).toBe("Claim");
  });

  it("rejects non-string content values in node objects", () => {
    const badContent = JSON.stringify({
      nodes: [{ id: "n1", type: "claim", content: 12345 }],
      edges: [],
    });
    expect(() => parseGraph(badContent)).toThrow(/nodes\[0\].content must be a string/);
  });

  it("rejects non-object root input in validateGraph", () => {
    expect(() => validateGraph("plain string" as any)).toThrow(/graph is not an object/);
    expect(() => validateGraph(null as any)).toThrow(/graph is not an object/);
    expect(() => validateGraph([] as any)).toThrow(/graph is not an object/);
  });

  it("renders cyclic reference notice in Markdown export without infinite looping", () => {
    const cyclicGraph: Graph = {
      nodes: [
        { id: "root", type: "claim", content: "Root Question" },
        { id: "a", type: "support", content: "Support A" },
        { id: "b", type: "support", content: "Support B" },
      ],
      edges: [
        { id: "e0", from: "a", to: "root", edgeType: "supports" },
        { id: "e1", from: "b", to: "a", edgeType: "supports" },
        { id: "e2", from: "a", to: "b", edgeType: "supports" }, // Cycle a <-> b
      ],
    };

    const md = exportGraphToMarkdown(cyclicGraph);
    expect(typeof md).toBe("string");
    expect(md).toContain("### [Claim] Root Question");
    expect(md).toContain("- **[Support]** Support A");
    expect(md).toContain("(Cyclic reference to:");
  });
});
