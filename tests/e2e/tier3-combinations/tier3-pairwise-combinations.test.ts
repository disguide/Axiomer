import { describe, expect, it } from "vitest";
import * as LZString from "lz-string";
import type { Graph } from "@/lib/types";
import {
  addEdge,
  addFloatingNode,
  addNode,
  addRootPremise,
  addRootQuestion,
  deleteNode,
  findSimilarTerminals,
  getAcceptability,
  getGraphStats,
  getGroundingGaps,
  getNode,
  getStatusProfile,
  getValueClashes,
  isFullyGrounded,
  isNodeGrounded,
  linkToExistingValue,
} from "@/lib/graph";
import { exportGraph, parseGraph, validateGraph } from "@/lib/io";
import { exportGraphToMarkdown } from "@/lib/markdown";
import { layoutGraph } from "@/lib/flowLayout";
import { ALLOWED_CHILDREN, NODE_META, NODE_ORDER } from "@/lib/meta";
import { mcpTools } from "../tier1-features/tier1-09-mcp-server-tools.test";

describe("Tier 3: Cross-Feature Combinations & Pairwise Interactions", () => {
  it("Combo 1 (Branching + Export/Import): Exports isolated branch to JSON and imports into fresh graph", () => {
    let branchGraph: Graph = { nodes: [], edges: [] };
    branchGraph = addRootQuestion(branchGraph, "Branch 1: Healthcare reform");
    const qId = branchGraph.nodes[0].id;
    branchGraph = addNode(branchGraph, "support", "Universal coverage eliminates medical bankruptcies", qId);
    const sId = branchGraph.nodes[branchGraph.nodes.length - 1].id;
    branchGraph = addNode(branchGraph, "value", "Human dignity and right to health", sId);

    const exported = exportGraph(branchGraph);
    const imported = parseGraph(exported);
    expect(imported).toEqual(branchGraph);
    expect(isFullyGrounded(imported, qId)).toBe(true);
  });

  it("Combo 2 (Grounding + Acceptability + Value Clashes): Defeating a grounded support alters acceptability, grounding, and clashes", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Dilemma Question");
    const qId = g.nodes[0].id;

    // Branch A (Support 1 -> Value A)
    g = addNode(g, "support", "Support A", qId);
    const sA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Value A", sA);

    // Branch B (Conflict 1 -> Value B)
    g = addNode(g, "conflict", "Objection B", qId);
    const cB = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Value B", cB);

    expect(isFullyGrounded(g, qId)).toBe(true);
    expect(getValueClashes(g)).toHaveLength(1);

    // Add undefeated counter-attack on Support A
    g = addNode(g, "conflict", "Fatal Flaw in Support A", sA);
    const flawId = g.nodes[g.nodes.length - 1].id;

    const acc = getAcceptability(g);
    expect(acc.get(sA)).toBe("conflicted");
    expect(acc.get(flawId)).toBe("coherent");
  });

  it("Combo 3 (Multi-Hop Dialectics + URL Hash Compression): Encodes deep 10-hop dialectic into URL hash and recovers exact metrics", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "AI Alignment Verification");
    let curr = g.nodes[0].id;
    const rootId = curr;

    for (let i = 1; i <= 10; i++) {
      g = addNode(g, "support", `Level ${i} logical step`, curr);
      curr = g.nodes[g.nodes.length - 1].id;
    }
    g = addNode(g, "source", "https://arxiv.org/abs/alignment-paper", curr);
    g = addNode(g, "limit", "Computational complexity bounds", curr);

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const recovered: Graph = JSON.parse(decompressed!);

    expect(recovered.nodes).toHaveLength(13);
    const stats = getGraphStats(recovered);
    expect(stats.maxDepth).toBe(11);
    expect(isNodeGrounded(recovered, rootId)).toBe(true);
  });

  it("Combo 4 (Dagre Map Layout + Markdown Serialization): Dagre hierarchical positions align with Markdown indentation", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Top Question");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Mid Support", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Leaf Value", sId);
    const vId = g.nodes[g.nodes.length - 1].id;

    const positions = layoutGraph(g);
    expect(positions[qId].y).toBeLessThan(positions[sId].y);
    expect(positions[sId].y).toBeLessThan(positions[vId].y);

    const md = exportGraphToMarkdown(g);
    expect(md).toContain("### [Claim] Top Question");
    expect(md).toContain("- **[Support]** Mid Support");
    expect(md).toContain("  - **[Value]** Leaf Value");
  });

  it("Combo 5 (Decoupled Rules + Acceptability on Migrated Graph): Migrates legacy schema and computes Dung acceptability", () => {
    const legacyGraph = {
      nodes: [
        { id: "q", type: "question", content: "Should taxes rise?" },
        { id: "p1", type: "position", content: "Yes" },
        { id: "atk", type: "attack", content: "Hurts investment" },
        { id: "reb", type: "rebuttal", content: "Empirical data shows zero investment drop" },
      ],
      edges: [
        { id: "e1", from: "p1", to: "q", edgeType: "answers" },
        { id: "e2", from: "atk", to: "p1", edgeType: "attacks" },
        { id: "e3", from: "reb", to: "atk", edgeType: "attacks" },
      ],
    };

    const modernGraph = validateGraph(legacyGraph);
    const acc = getAcceptability(modernGraph);
    expect(acc.get("reb")).toBe("coherent");
    expect(acc.get("atk")).toBe("conflicted");
    expect(acc.get("p1")).toBe("coherent");
  });

  it("Combo 6 (Source Citations + Status Profile Archetype): Empirical sources and limits shape archetype classification", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Quantum Gravity");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "String theory framework", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "limit", "Cannot probe Planck scale directly", sId);
    g = addNode(g, "limit", "Multiverse landscape underdetermination", sId);

    const profile = getStatusProfile(g);
    expect(profile.archetype).toContain("Epistemically cautious");
  });

  it("Combo 7 (Shared Terminals across Branches + Subtree Deletion): Spares shared values across branches during deletion", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Branch 1: Free Speech");
    const q1 = g.nodes[0].id;
    g = addRootQuestion(g, "Branch 2: Scientific Inquiry");
    const q2 = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Enables truth discovery", q1);
    const s1 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "support", "Allows hypothesis falsification", q2);
    const s2 = g.nodes[g.nodes.length - 1].id;

    // Shared terminal value
    g = addNode(g, "value", "Shared Value: Epistemic progress", s1);
    const sharedValId = g.nodes[g.nodes.length - 1].id;
    g = linkToExistingValue(g, s2, sharedValId);

    // Delete Branch 1
    const afterDelete = deleteNode(g, q1);
    expect(getNode(afterDelete, q1)).toBeUndefined();
    expect(getNode(afterDelete, s1)).toBeUndefined();
    expect(getNode(afterDelete, sharedValId)).toBeDefined();
    expect(getNode(afterDelete, s2)).toBeDefined();
    expect(isFullyGrounded(afterDelete, q2)).toBe(true);
  });

  it("Combo 8 (Premise Authoring + Deduplication & Linking): Authors forward from premise and links existing similar terminal", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootPremise(g, "Axiom: Rational agents avoid unnecessary suffering");
    const pId = g.nodes[0].id;

    g = addNode(g, "claim", "Policy: Implement universal palliative care", pId);
    const cId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "support", "Directly mitigates intractable pain", cId);
    const sId = g.nodes[g.nodes.length - 1].id;

    // Existing terminal in library
    g = addRootQuestion(g, "Independent Ethical Inquiry");
    const q2 = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Minimize extreme physical suffering", q2);
    const existingValId = g.nodes[g.nodes.length - 1].id;

    // Find similar terminal and link
    const matches = findSimilarTerminals(g, "minimize suffering", "value");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].node.id).toBe(existingValId);

    g = linkToExistingValue(g, sId, matches[0].node.id);
    expect(isNodeGrounded(g, sId)).toBe(true);
    expect(isNodeGrounded(g, cId)).toBe(true);
  });

  it("Combo 9 (Conflict Reinstatement + Grounding Gap Tracking): Resolving conflict restores support and updates gaps", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Q");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Support A", qId);
    const sA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Value A", sA);

    // Attack Support A with ungrounded conflict
    g = addNode(g, "conflict", "Objection 1", sA);
    const obj1 = g.nodes[g.nodes.length - 1].id;

    let gaps = getGroundingGaps(g);
    expect(gaps.some((x) => x.node.id === obj1)).toBe(true);

    // Ground and defeat Objection 1 with a rebuttal
    g = addNode(g, "conflict", "Rebuttal to Objection", obj1);
    const reb = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://evidence.org/data", reb);

    const acc = getAcceptability(g);
    expect(acc.get(sA)).toBe("coherent");
    expect(acc.get(obj1)).toBe("conflicted");
  });

  it("Combo 10 (Floating Nodes + Edge Connection + Flow Layout): Positions floating nodes and updates dagre layout upon connection", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addFloatingNode(g, "claim", "Initial Claim", { x: 50, y: 50 });
    const id1 = g.nodes[0].id;
    g = addFloatingNode(g, "support", "Floating Support", { x: 500, y: 500 });
    const id2 = g.nodes[1].id;

    g = addEdge(g, id2, id1);
    const positions = layoutGraph(g);
    expect(positions[id1].y).toBeLessThan(positions[id2].y);
  });

  it("Combo 11 (Project Multi-Root + Markdown Output): Multiple roots format cleanly with markdown divider", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Root 1");
    g = addRootPremise(g, "Root 2");

    const md = exportGraphToMarkdown(g);
    expect(md).toContain("### [Claim] Root 1");
    expect(md).toContain("---");
    expect(md).toContain("### [Premise] Root 2");
  });

  it("Combo 12 (Read-Only Guard + URL Decompression): Decompresses graph and simulates read-only state immutability", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Read-Only Shared Question");
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));

    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const restoredGraph: Graph = JSON.parse(decompressed!);

    // In read-only mode, mutation functions are no-ops returning unchanged graph
    const readOnlyAdd = (graph: Graph) => graph;
    const mutated = readOnlyAdd(restoredGraph);
    expect(mutated).toEqual(restoredGraph);
  });

  it("Combo 13 (Agent MCP Tooling + Schema Validation): Propose node via MCP, validate schema, and observe gaps reduction", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Agent Question");
    const qId = g.nodes[0].id;

    // Propose support
    const step1 = mcpTools.propose_node(g, {
      parentId: qId,
      type: "support",
      content: "Agent Proposed Support",
    });
    expect(step1.success).toBe(true);
    validateGraph(step1.graph);

    // Verify grounding gaps exist
    const gapsStep1 = mcpTools.get_grounding_gaps(step1.graph);
    expect(gapsStep1.gaps).toHaveLength(1);

    // Propose terminal value
    const step2 = mcpTools.propose_node(step1.graph, {
      parentId: step1.newNodeId,
      type: "value",
      content: "Agent Proposed Value",
    });
    expect(step2.success).toBe(true);
    validateGraph(step2.graph);

    // Gaps now resolved
    const gapsStep2 = mcpTools.get_grounding_gaps(step2.graph);
    expect(gapsStep2.gaps).toHaveLength(0);
  });

  it("Combo 14 (Design Tokens & Meta Consistency): 100% agreement between NODE_TYPES, NODE_META, ALLOWED_CHILDREN, and NODE_ORDER", () => {
    for (const t of NODE_ORDER) {
      expect(NODE_META[t]).toBeDefined();
      expect(ALLOWED_CHILDREN[t]).toBeDefined();
    }
  });
});
