import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  getGroundingGaps,
  isFullyGrounded,
  isNodeGrounded,
} from "@/lib/graph";

describe("Tier 2 - Boundary 2: Recursive Grounding Boundary Cases", () => {
  it("evaluates a 50-hop deep recursive support chain without stack overflow", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Deep Claim");
    let currentId = g.nodes[0].id;
    const rootId = currentId;

    for (let i = 1; i <= 50; i++) {
      g = addNode(g, "support", `Support Level ${i}`, currentId);
      currentId = g.nodes[g.nodes.length - 1].id;
    }

    expect(isFullyGrounded(g, rootId)).toBe(false);

    // Ground the 50th support node in a bedrock terminal
    g = addNode(g, "bedrock", "Deep Bedrock Truth", currentId);

    expect(isFullyGrounded(g, rootId)).toBe(true);
    expect(isNodeGrounded(g, rootId)).toBe(true);
  });

  it("terminates safely on a cyclic support graph without hanging or infinite looping", () => {
    const cyclicGraph: Graph = {
      nodes: [
        { id: "q1", type: "claim", content: "Claim 1" },
        { id: "s1", type: "support", content: "Support 1" },
        { id: "s2", type: "support", content: "Support 2" },
      ],
      edges: [
        { id: "e1", from: "s1", to: "q1", edgeType: "supports" },
        { id: "e2", from: "s2", to: "s1", edgeType: "supports" },
        { id: "e3", from: "s1", to: "s2", edgeType: "supports" }, // Cycle s1 <-> s2
      ],
    };

    expect(isFullyGrounded(cyclicGraph, "q1")).toBe(false);
    expect(isNodeGrounded(cyclicGraph, "s1")).toBe(false);
  });

  it("evaluates orphaned and disconnected terminals without errors", () => {
    const disconnectedGraph: Graph = {
      nodes: [
        { id: "v_alone", type: "value", content: "Orphaned Value" },
        { id: "l_alone", type: "limit", content: "Orphaned Limit" },
        { id: "b_alone", type: "bedrock", content: "Orphaned Bedrock" },
      ],
      edges: [],
    };

    expect(isNodeGrounded(disconnectedGraph, "v_alone")).toBe(true);
    expect(isNodeGrounded(disconnectedGraph, "l_alone")).toBe(true);
    expect(isNodeGrounded(disconnectedGraph, "b_alone")).toBe(true);
    expect(getGroundingGaps(disconnectedGraph)).toHaveLength(0);
  });

  it("handles non-existent node IDs gracefully in grounding queries", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    expect(isFullyGrounded(emptyGraph, "non_existent_id")).toBe(false);
    expect(isNodeGrounded(emptyGraph, "non_existent_id")).toBe(false);
  });

  it("evaluates a wide multi-branch forest of 30 arguments with partial grounding", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Broad Question");
    const qId = g.nodes[0].id;

    const supportIds: string[] = [];
    for (let i = 0; i < 30; i++) {
      g = addNode(g, "support", `Branch ${i}`, qId);
      supportIds.push(g.nodes[g.nodes.length - 1].id);
    }

    // Ground only the first 29 branches
    for (let i = 0; i < 29; i++) {
      g = addNode(g, "value", `Value ${i}`, supportIds[i]);
    }

    // Since 1 branch remains ungrounded, the root claim must NOT be fully grounded
    expect(isFullyGrounded(g, qId)).toBe(false);
    expect(getGroundingGaps(g)).toHaveLength(1);
    expect(getGroundingGaps(g)[0].node.id).toBe(supportIds[29]);

    // Ground the last branch
    g = addNode(g, "value", "Value 29", supportIds[29]);
    expect(isFullyGrounded(g, qId)).toBe(true);
    expect(getGroundingGaps(g)).toHaveLength(0);
  });
});
