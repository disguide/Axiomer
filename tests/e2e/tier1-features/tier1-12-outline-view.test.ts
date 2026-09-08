import { describe, expect, it } from "vitest";
import type { Graph, GraphNode } from "@/lib/types";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  getAcceptability,
  getChildren,
  getDepth,
  getRoots,
  isNodeGrounded,
} from "@/lib/graph";
import { ALLOWED_CHILDREN } from "@/lib/meta";

describe("Tier 1 - Feature 12: Responsive Outline View & Wrapping", () => {
  // Pure helper simulating outline tree flattening for hierarchical rendering
  function flattenOutlineTree(graph: Graph) {
    const items: Array<{
      node: GraphNode;
      depth: number;
      grounded: boolean;
      acceptability: string;
      canAddChildren: boolean;
    }> = [];

    const acc = getAcceptability(graph);

    function walk(node: GraphNode, depth: number, visited: Set<string>) {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      items.push({
        node,
        depth,
        grounded: isNodeGrounded(graph, node.id),
        acceptability: acc.get(node.id) || "coherent",
        canAddChildren: ALLOWED_CHILDREN[node.type].length > 0,
      });

      for (const child of getChildren(graph, node.id)) {
        walk(child, depth + 1, visited);
      }
      visited.delete(node.id);
    }

    for (const root of getRoots(graph)) {
      walk(root, 0, new Set());
    }

    return items;
  }

  it("computes accurate indentation depths for outline items", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Top Level Question");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Level 1 Support", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Level 2 Terminal Value", sId);
    const vId = g.nodes[g.nodes.length - 1].id;

    expect(getDepth(g, qId)).toBe(0);
    expect(getDepth(g, sId)).toBe(1);
    expect(getDepth(g, vId)).toBe(2);

    const outline = flattenOutlineTree(g);
    expect(outline).toHaveLength(3);
    expect(outline[0].depth).toBe(0);
    expect(outline[1].depth).toBe(1);
    expect(outline[2].depth).toBe(2);
  });

  it("correctly flags terminal nodes so authoring controls are disabled in outline", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Claim");
    const qId = g.nodes[0].id;
    g = addNode(g, "value", "Terminal Value", qId);

    const outline = flattenOutlineTree(g);
    expect(outline[0].canAddChildren).toBe(true); // Claim can have children
    expect(outline[1].canAddChildren).toBe(false); // Terminal Value cannot have children
  });

  it("annotates outline items with accurate acceptability badges (coherent, conflicted)", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Target Claim");
    const qId = g.nodes[0].id;
    g = addNode(g, "conflict", "Direct Contradiction", qId);

    const outline = flattenOutlineTree(g);
    const claimItem = outline.find((item) => item.node.type === "claim");
    const conflictItem = outline.find((item) => item.node.type === "conflict");

    expect(claimItem?.acceptability).toBe("conflicted");
    expect(conflictItem?.acceptability).toBe("coherent");
  });

  it("renders multiple separate root blocks (claims and premises) in outline", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root Question 1");
    g = addRootPremise(g, "Root Premise 2");

    const outline = flattenOutlineTree(g);
    const rootItems = outline.filter((item) => item.depth === 0);
    expect(rootItems).toHaveLength(2);
    expect(rootItems[0].node.type).toBe("claim");
    expect(rootItems[1].node.type).toBe("premise");
  });

  it("tracks per-node grounded status badge in outline tree", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Ungrounded Claim");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Ungrounded Support", qId);

    let outline = flattenOutlineTree(g);
    expect(outline[0].grounded).toBe(false);
    expect(outline[1].grounded).toBe(false);

    // Add bedrock terminal to support
    const supId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "bedrock", "Axiomatic bedrock", supId);

    outline = flattenOutlineTree(g);
    expect(outline[0].grounded).toBe(true);
    expect(outline[1].grounded).toBe(true);
    expect(outline[2].grounded).toBe(true);
  });
});
