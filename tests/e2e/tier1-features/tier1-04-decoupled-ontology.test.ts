import { describe, expect, it } from "vitest";
import {
  migrateGraph,
  NODE_TYPES,
  type Graph,
  type NodeType,
} from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  countDescendants,
  deleteNode,
  editNode,
  findSimilarTerminals,
  getNode,
  linkToExistingValue,
  similarity,
} from "@/lib/graph";
import { ALLOWED_CHILDREN } from "@/lib/meta";

describe("Tier 1 - Feature 4: Decoupled Ontology Rules", () => {
  it("exports pure ALLOWED_CHILDREN rules without React / DOM dependencies", () => {
    expect(ALLOWED_CHILDREN).toBeDefined();
    for (const type of NODE_TYPES) {
      expect(Array.isArray(ALLOWED_CHILDREN[type])).toBe(true);
    }
    // Verify terminal nodes allow no children
    const terminals: NodeType[] = ["value", "source", "limit", "bedrock", "preference"];
    for (const t of terminals) {
      expect(ALLOWED_CHILDREN[t]).toEqual([]);
    }
  });

  it("migrates legacy 22-type schema accurately to the 10-node / 5-edge ontology", () => {
    const legacyGraph = {
      nodes: [
        { id: "n1", type: "question", content: "What is justice?" },
        { id: "n2", type: "position", content: "Justice is fairness" },
        { id: "n3", type: "argument-support", content: "Rawls original position" },
        { id: "n4", type: "logical-fallacy", content: "Circular definition" },
        { id: "n5", type: "epistemic-limit", content: "Cannot observe ideal observer" },
        { id: "n6", type: "principle", content: "Equal basic liberties" },
        { id: "n7", type: "assumption", content: "Rational actors exist" },
      ],
      edges: [
        { id: "e1", from: "n2", to: "n1", edgeType: "answers" },
        { id: "e2", from: "n3", to: "n2", edgeType: "supports" },
        { id: "e3", from: "n4", to: "n3", edgeType: "objects-to" },
        { id: "e4", from: "n3", to: "n5", edgeType: "grounds-in" },
        { id: "e5", from: "n3", to: "n6", edgeType: "grounds-in" },
        { id: "e6", from: "n7", to: "n3", edgeType: "connects-to" },
      ],
    };

    const migrated = migrateGraph(legacyGraph);

    // Verify node type migrations
    expect(migrated.nodes.find((n) => n.id === "n1")?.type).toBe("claim");
    expect(migrated.nodes.find((n) => n.id === "n2")?.type).toBe("claim");
    expect(migrated.nodes.find((n) => n.id === "n3")?.type).toBe("support");
    expect(migrated.nodes.find((n) => n.id === "n4")?.type).toBe("conflict");
    expect(migrated.nodes.find((n) => n.id === "n5")?.type).toBe("limit");
    expect(migrated.nodes.find((n) => n.id === "n6")?.type).toBe("value");
    expect(migrated.nodes.find((n) => n.id === "n7")?.type).toBe("note");

    // Verify edge type migrations
    expect(migrated.edges.find((e) => e.id === "e1")?.edgeType).toBe("supports");
    expect(migrated.edges.find((e) => e.id === "e2")?.edgeType).toBe("supports");
    expect(migrated.edges.find((e) => e.id === "e3")?.edgeType).toBe("conflicts");
    expect(migrated.edges.find((e) => e.id === "e4")?.edgeType).toBe("grounds");
    expect(migrated.edges.find((e) => e.id === "e5")?.edgeType).toBe("grounds");
    expect(migrated.edges.find((e) => e.id === "e6")?.edgeType).toBe("annotates");
  });

  it("performs immutable node transforms without mutating original graph instances", () => {
    const original: Graph = { nodes: [], edges: [] };
    const withRoot = addRootQuestion(original, "Root Q");
    expect(original.nodes).toHaveLength(0);
    expect(withRoot.nodes).toHaveLength(1);

    const rootId = withRoot.nodes[0].id;
    const withChild = addNode(withRoot, "support", "Child Arg", rootId);
    expect(withRoot.nodes).toHaveLength(1);
    expect(withChild.nodes).toHaveLength(2);

    const edited = editNode(withChild, rootId, "Updated Root Content");
    expect(getNode(withChild, rootId)?.content).toBe("Root Q");
    expect(getNode(edited, rootId)?.content).toBe("Updated Root Content");

    const deleted = deleteNode(edited, rootId);
    expect(deleted.nodes).toHaveLength(0);
    expect(edited.nodes).toHaveLength(2);
  });

  it("preserves shared terminal nodes when deleting one parent branch", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Branch A");
    const qA = g.nodes[0].id;
    g = addRootQuestion(g, "Branch B");
    const qB = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Support A", qA);
    const supA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "support", "Support B", qB);
    const supB = g.nodes[g.nodes.length - 1].id;

    // Terminal value under Support A
    g = addNode(g, "value", "Shared Value: Liberty", supA);
    const valId = g.nodes[g.nodes.length - 1].id;

    // Link Support B to Liberty
    g = linkToExistingValue(g, supB, valId);

    // Verify descendant count for Branch A excludes spared shared terminal
    expect(countDescendants(g, qA)).toBe(1); // just supA, valId is spared

    // Delete Branch A
    const afterDelete = deleteNode(g, qA);

    // Branch A and Support A must be deleted
    expect(getNode(afterDelete, qA)).toBeUndefined();
    expect(getNode(afterDelete, supA)).toBeUndefined();

    // Shared terminal value MUST survive because Support B still grounds it
    expect(getNode(afterDelete, valId)).toBeDefined();
    expect(getNode(afterDelete, supB)).toBeDefined();
    expect(getNode(afterDelete, qB)).toBeDefined();
  });

  it("computes string similarity and finds matching terminals for value deduplication", () => {
    expect(similarity("Maximize autonomy", "maximize  autonomy!")).toBe(1);
    expect(similarity("Preserve life", "preserve human life")).toBeGreaterThanOrEqual(0.5);
    expect(similarity("Completely unrelated topic", "Quantum mechanics")).toBeLessThan(0.3);

    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Q");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Arg", qId);
    const aId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Protect individual privacy rights", aId);

    const matches = findSimilarTerminals(g, "privacy rights", "value");
    expect(matches).toHaveLength(1);
    expect(matches[0].node.content).toBe("Protect individual privacy rights");
    expect(matches[0].score).toBeGreaterThanOrEqual(0.5);

    // Filter by type: searching for limit shouldn't match value
    expect(findSimilarTerminals(g, "privacy rights", "limit")).toHaveLength(0);
  });
});
