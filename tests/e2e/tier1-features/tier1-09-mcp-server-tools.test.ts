import { describe, expect, it } from "vitest";
import type { Graph, NodeType } from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  getAcceptability,
  getChildren,
  getGraphStats,
  getGroundingGaps,
  getNode,
  getRoots,
  getValueClashes,
} from "@/lib/graph";
import { ALLOWED_CHILDREN } from "@/lib/meta";

// Pure MCP tool implementations adhering to PROJECT.md interface contract
export const mcpTools = {
  get_graph: (graph: Graph) => ({
    graph,
    stats: getGraphStats(graph),
  }),

  get_children: (graph: Graph, params: { nodeId: string }) => {
    const node = getNode(graph, params.nodeId);
    if (!node) throw new Error(`Node ${params.nodeId} not found`);
    return {
      node,
      children: getChildren(graph, params.nodeId),
    };
  },

  get_roots: (graph: Graph) => ({
    roots: getRoots(graph),
  }),

  get_grounding_gaps: (graph: Graph) => ({
    gaps: getGroundingGaps(graph).map((g) => ({
      nodeId: g.node.id,
      content: g.node.content,
      type: g.node.type,
      rootId: g.root?.id,
      depth: g.depth,
    })),
  }),

  get_acceptability: (graph: Graph) => {
    const map = getAcceptability(graph);
    const result: Record<string, string> = {};
    for (const [k, v] of map.entries()) {
      result[k] = v;
    }
    return { acceptability: result };
  },

  get_value_clashes: (graph: Graph) => ({
    clashes: getValueClashes(graph).map((c) => ({
      questionId: c.question.id,
      question: c.question.content,
      values: c.values.map((v) => ({ id: v.id, content: v.content, type: v.type })),
    })),
  }),

  propose_node: (
    graph: Graph,
    params: { parentId: string; type: NodeType; content: string }
  ) => {
    const parent = getNode(graph, params.parentId);
    if (!parent) throw new Error(`Parent node ${params.parentId} not found`);

    const allowed = ALLOWED_CHILDREN[parent.type];
    if (!allowed.includes(params.type)) {
      throw new Error(
        `Invalid child type "${params.type}" for parent type "${parent.type}". Allowed: ${allowed.join(", ")}`
      );
    }

    const updatedGraph = addNode(graph, params.type, params.content, params.parentId);
    const newNode = updatedGraph.nodes[updatedGraph.nodes.length - 1];
    return {
      success: true,
      newNodeId: newNode.id,
      graph: updatedGraph,
    };
  },
};

describe("Tier 1 - Feature 9: MCP Server Tools", () => {
  it("executes get_graph returning nodes, edges, and graph metrics", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Open Q");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Arg", qId);

    const result = mcpTools.get_graph(g);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(1);
    expect(result.stats.claims).toBe(1);
    expect(result.stats.supports).toBe(1);
    expect(result.stats.openClaims).toBe(1);
  });

  it("executes get_children and get_roots to inspect tree hierarchy", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root Claim");
    const rId = g.nodes[0].id;
    g = addNode(g, "support", "Child 1", rId);
    g = addNode(g, "conflict", "Child 2", rId);

    const rootsResult = mcpTools.get_roots(g);
    expect(rootsResult.roots).toHaveLength(1);
    expect(rootsResult.roots[0].id).toBe(rId);

    const childrenResult = mcpTools.get_children(g, { nodeId: rId });
    expect(childrenResult.children).toHaveLength(2);
    const childTypes = childrenResult.children.map((c) => c.type).sort();
    expect(childTypes).toEqual(["conflict", "support"]);
  });

  it("executes get_grounding_gaps returning ungrounded arguments prioritized by depth", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Epistemic Root");
    const rId = g.nodes[0].id;
    g = addNode(g, "support", "Ungrounded support", rId);

    const gapsResult = mcpTools.get_grounding_gaps(g);
    expect(gapsResult.gaps).toHaveLength(1);
    expect(gapsResult.gaps[0].content).toBe("Ungrounded support");
    expect(gapsResult.gaps[0].depth).toBe(1);
  });

  it("executes get_acceptability and get_value_clashes for epistemic evaluation", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Trolley Problem");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Option A", qId);
    const sA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Value A: Aggregate Welfare", sA);

    g = addNode(g, "conflict", "Option B", qId);
    const sB = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Value B: Rights & Duties", sB);

    const accResult = mcpTools.get_acceptability(g);
    expect(accResult.acceptability[sB]).toBe("coherent");

    const clashesResult = mcpTools.get_value_clashes(g);
    expect(clashesResult.clashes).toHaveLength(1);
    expect(clashesResult.clashes[0].questionId).toBe(qId);
    expect(clashesResult.clashes[0].values).toHaveLength(2);
  });

  it("executes propose_node with strict ontology validation before adding nodes", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root Q");
    const qId = g.nodes[0].id;

    // Valid proposal
    const validProposal = mcpTools.propose_node(g, {
      parentId: qId,
      type: "support",
      content: "Valid proposed support argument",
    });
    expect(validProposal.success).toBe(true);
    expect(validProposal.graph.nodes).toHaveLength(2);

    const supportId = validProposal.newNodeId;
    const withTerminal = mcpTools.propose_node(validProposal.graph, {
      parentId: supportId,
      type: "bedrock",
      content: "Axiomatic bedrock",
    });
    expect(withTerminal.success).toBe(true);

    // Invalid proposal: attempting to add a child to a terminal bedrock
    const terminalId = withTerminal.newNodeId;
    expect(() =>
      mcpTools.propose_node(withTerminal.graph, {
        parentId: terminalId,
        type: "support",
        content: "Cannot attach to terminal",
      })
    ).toThrow(/Invalid child type "support" for parent type "bedrock"/);
  });
});
