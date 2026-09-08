import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { mcpTools } from "../tier1-features/tier1-09-mcp-server-tools.test";

describe("Tier 2 - Boundary 9: MCP Server Tools Boundary Cases", () => {
  it("throws informative error when get_children is called on non-existent node ID", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    expect(() =>
      mcpTools.get_children(emptyGraph, { nodeId: "non_existent_node_id" })
    ).toThrow(/Node non_existent_node_id not found/);
  });

  it("throws informative error when propose_node is called with non-existent parent ID", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    expect(() =>
      mcpTools.propose_node(emptyGraph, {
        parentId: "ghost_parent",
        type: "support",
        content: "Arg",
      })
    ).toThrow(/Parent node ghost_parent not found/);
  });

  it("executes get_grounding_gaps on a completely ungrounded 30-node forest without degradation", () => {
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 30; i++) {
      nodes.push({ id: `q_${i}`, type: "claim" as const, content: `Question ${i}` });
      nodes.push({ id: `s_${i}`, type: "support" as const, content: `Support ${i}` });
      edges.push({ id: `e_${i}`, from: `s_${i}`, to: `q_${i}`, edgeType: "supports" as const });
    }
    const g: Graph = { nodes, edges };

    const gapsResult = mcpTools.get_grounding_gaps(g);
    expect(gapsResult.gaps).toHaveLength(30);
  });

  it("executes get_value_clashes on a graph with 0 clashes returning empty list", () => {
    const g: Graph = {
      nodes: [
        { id: "q1", type: "claim", content: "Unclashed Question" },
        { id: "s1", type: "support", content: "Support" },
        { id: "v1", type: "value", content: "Single Value" },
      ],
      edges: [
        { id: "e1", from: "s1", to: "q1", edgeType: "supports" },
        { id: "e2", from: "s1", to: "v1", edgeType: "grounds" },
      ],
    };

    const clashesResult = mcpTools.get_value_clashes(g);
    expect(clashesResult.clashes).toHaveLength(0);
  });

  it("executes get_roots on an empty graph returning empty array", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    const rootsResult = mcpTools.get_roots(emptyGraph);
    expect(rootsResult.roots).toHaveLength(0);
  });
});
