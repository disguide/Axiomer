import { describe, expect, it } from "vitest";
import type { Graph, GraphEdge, GraphNode } from "@/lib/types";
import { migrateGraph } from "@/lib/types";
import { deleteNode, editNode, similarity } from "@/lib/graph";

describe("Tier 2 - Boundary 4: Decoupled Rules Boundary Cases", () => {
  it("migrates unknown/custom legacy node types by falling back to their original type string", () => {
    const customGraph = {
      nodes: [{ id: "n1", type: "novel-experimental-type", content: "Custom node" }],
      edges: [],
    };
    const migrated = migrateGraph(customGraph as any);
    expect(migrated.nodes[0].type).toBe("novel-experimental-type");
  });

  it("deletes root in a 100-node linear hierarchy, returning empty graph cleanly", () => {
    const nodes: GraphNode[] = [{ id: "root", type: "claim", content: "Root" }];
    const edges: GraphEdge[] = [];

    for (let i = 1; i <= 100; i++) {
      nodes.push({ id: `node_${i}`, type: "support", content: `Node ${i}` });
      edges.push({
        id: `edge_${i}`,
        from: `node_${i}`,
        to: i === 1 ? "root" : `node_${i - 1}`,
        edgeType: "supports" as const,
      });
    }

    const g: Graph = { nodes, edges };
    expect(g.nodes).toHaveLength(101);

    const deleted = deleteNode(g, "root");
    expect(deleted.nodes).toHaveLength(0);
    expect(deleted.edges).toHaveLength(0);
  });

  it("returns an identical graph when deleting a non-existent node ID", () => {
    const g: Graph = {
      nodes: [{ id: "n1", type: "claim", content: "Existing Node" }],
      edges: [],
    };
    const result = deleteNode(g, "does_not_exist");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("n1");
  });

  it("returns an identical graph when editing a non-existent node ID", () => {
    const g: Graph = {
      nodes: [{ id: "n1", type: "claim", content: "Original" }],
      edges: [],
    };
    const result = editNode(g, "does_not_exist", "New Content");
    expect(result.nodes[0].content).toBe("Original");
  });

  it("handles similarity edge cases: empty strings, whitespace, and punctuation", () => {
    expect(similarity("", "")).toBe(0);
    expect(similarity("   ", "   ")).toBe(0);
    expect(similarity("!!!???", "....")).toBe(0);
    expect(similarity("Human flourishing", "human flourishing")).toBe(1);
  });
});
