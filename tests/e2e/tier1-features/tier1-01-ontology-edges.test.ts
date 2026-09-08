import { describe, expect, it } from "vitest";
import {
  EDGE_TYPES,
  isTerminalType,
  NODE_TYPES,
  TERMINAL_TYPES,
  type Graph,
  type NodeType,
} from "@/lib/types";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  edgeEndpoints,
  edgeTypeFor,
} from "@/lib/graph";
import { ALLOWED_CHILDREN } from "@/lib/types";

describe("Tier 1 - Feature 1: 10-Node Ontology & 5 Edge Types", () => {
  it("defines exactly the 10 canonical node types partitioned into structural and terminal", () => {
    expect(NODE_TYPES).toHaveLength(10);
    expect([...NODE_TYPES].sort()).toEqual([
      "bedrock",
      "claim",
      "conflict",
      "limit",
      "note",
      "preference",
      "premise",
      "source",
      "support",
      "value",
    ]);

    // 5 structural types
    const structuralTypes: NodeType[] = ["claim", "premise", "support", "conflict", "note"];
    for (const t of structuralTypes) {
      expect(isTerminalType(t)).toBe(false);
      expect(TERMINAL_TYPES.includes(t)).toBe(false);
    }

    // 5 terminal types
    const terminalTypes: NodeType[] = ["value", "source", "limit", "bedrock", "preference"];
    expect(TERMINAL_TYPES).toHaveLength(5);
    for (const t of terminalTypes) {
      expect(isTerminalType(t)).toBe(true);
      expect(TERMINAL_TYPES.includes(t)).toBe(true);
    }
  });

  it("defines exactly the 5 semantic edge types", () => {
    expect(EDGE_TYPES).toHaveLength(5);
    expect([...EDGE_TYPES].sort()).toEqual([
      "annotates",
      "cites",
      "conflicts",
      "grounds",
      "supports",
    ]);
  });

  it("correctly infers semantic edge types via edgeTypeFor across all parent-child combinations", () => {
    // Premise parent always creates "supports"
    expect(edgeTypeFor("claim", "premise")).toBe("supports");
    expect(edgeTypeFor("support", "premise")).toBe("supports");
    expect(edgeTypeFor("conflict", "premise")).toBe("conflicts");

    // Support / Claim child creates "supports"
    expect(edgeTypeFor("support", "claim")).toBe("supports");
    expect(edgeTypeFor("claim", "claim")).toBe("supports");
    expect(edgeTypeFor("support", "support")).toBe("supports");

    // Conflict child creates "conflicts"
    expect(edgeTypeFor("conflict", "claim")).toBe("conflicts");
    expect(edgeTypeFor("conflict", "support")).toBe("conflicts");

    // Source child creates "cites"
    expect(edgeTypeFor("source", "claim")).toBe("cites");
    expect(edgeTypeFor("source", "support")).toBe("cites");
    expect(edgeTypeFor("source", "note")).toBe("cites");

    // Terminal children (value, limit, bedrock, preference) create "grounds"
    expect(edgeTypeFor("value", "support")).toBe("grounds");
    expect(edgeTypeFor("limit", "support")).toBe("grounds");
    expect(edgeTypeFor("bedrock", "support")).toBe("grounds");
    expect(edgeTypeFor("preference", "support")).toBe("grounds");

    // Note child creates "annotates"
    expect(edgeTypeFor("note", "claim")).toBe("annotates");
    expect(edgeTypeFor("note", "support")).toBe("annotates");
  });

  it("normalizes edge directionality (grounds/cites run parent→child, others child→parent)", () => {
    let graph: Graph = { nodes: [], edges: [] };
    graph = addRootQuestion(graph, "Should AI be open-source?");
    const qId = graph.nodes[0].id;

    // Add support (supports edge: from=support, to=claim)
    graph = addNode(graph, "support", "Enables public scrutiny", qId);
    const supId = graph.nodes[graph.nodes.length - 1].id;
    const supEdge = graph.edges.find((e) => e.from === supId || e.to === supId)!;
    expect(supEdge.edgeType).toBe("supports");
    expect(supEdge.from).toBe(supId);
    expect(supEdge.to).toBe(qId);
    expect(edgeEndpoints(supEdge)).toEqual({ parent: qId, child: supId });

    // Add terminal value (grounds edge: from=support, to=value)
    graph = addNode(graph, "value", "Scientific transparency", supId);
    const valId = graph.nodes[graph.nodes.length - 1].id;
    const valEdge = graph.edges.find((e) => e.from === valId || e.to === valId)!;
    expect(valEdge.edgeType).toBe("grounds");
    expect(valEdge.from).toBe(supId);
    expect(valEdge.to).toBe(valId);
    expect(edgeEndpoints(valEdge)).toEqual({ parent: supId, child: valId });

    // Add source citation (cites edge: from=support, to=source)
    graph = addNode(graph, "source", "https://arxiv.org/abs/2301.00000", supId);
    const srcId = graph.nodes[graph.nodes.length - 1].id;
    const srcEdge = graph.edges.find((e) => e.from === srcId || e.to === srcId)!;
    expect(srcEdge.edgeType).toBe("cites");
    expect(srcEdge.from).toBe(supId);
    expect(srcEdge.to).toBe(srcId);
    expect(edgeEndpoints(srcEdge)).toEqual({ parent: supId, child: srcId });

    // Add note annotation (annotates edge: from=note, to=support)
    graph = addNode(graph, "note", "Caveat on dual-use models", supId);
    const noteId = graph.nodes[graph.nodes.length - 1].id;
    const noteEdge = graph.edges.find((e) => e.from === noteId || e.to === noteId)!;
    expect(noteEdge.edgeType).toBe("annotates");
    expect(noteEdge.from).toBe(noteId);
    expect(noteEdge.to).toBe(supId);
    expect(edgeEndpoints(noteEdge)).toEqual({ parent: supId, child: noteId });
  });

  it("enforces allowed children rules for each node type in ontology", () => {
    // Terminals must have empty allowed children
    for (const t of TERMINAL_TYPES) {
      expect(ALLOWED_CHILDREN[t]).toEqual([]);
    }

    // Notes can only have conflict, note, source
    expect(ALLOWED_CHILDREN["note"]).toEqual(["conflict", "note", "source"]);

    // Claims and premises allow all 9 child types
    expect(ALLOWED_CHILDREN["claim"]).toHaveLength(9);
    expect(ALLOWED_CHILDREN["premise"]).toHaveLength(9);
    expect(ALLOWED_CHILDREN["support"]).toHaveLength(8); // no claim child
    expect(ALLOWED_CHILDREN["conflict"]).toHaveLength(8); // no claim child
  });

  it("constructs a rich heterogeneous graph containing all 10 node types and 5 edge types", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootPremise(g, "Rational agents seek truth");
    const premId = g.nodes[0].id;

    g = addNode(g, "claim", "Epistemic rigor is essential", premId);
    const claimId = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Empirical validation prevents error", claimId);
    const supId = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "conflict", "Over-formalization creates stagnation", claimId);
    const conId = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "note", "Definitions must remain clear", claimId);
    g = addNode(g, "value", "Maximize collective knowledge", supId);
    g = addNode(g, "source", "https://plato.stanford.edu/entries/epistemology", supId);
    g = addNode(g, "limit", "Cannot achieve Laplace demon certainty", supId);
    g = addNode(g, "bedrock", "I experience conscious doubt", supId);
    g = addNode(g, "preference", "I prefer open discourse", conId);

    expect(g.nodes).toHaveLength(10);
    const presentTypes = new Set(g.nodes.map((n) => n.type));
    expect(presentTypes.size).toBe(10);

    const presentEdgeTypes = new Set(g.edges.map((e) => e.edgeType));
    expect(presentEdgeTypes.size).toBe(5);
  });
});
