import { describe, expect, it } from "vitest";
import * as LZString from "lz-string";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  getAcceptability,
  getGraphStats,
  getStatusProfile,
  getValueClashes,
  isFullyGrounded,
  isNodeGrounded,
  verifySource,
} from "@/lib/graph";
import { exportGraph, parseGraph, validateGraph } from "@/lib/io";
import { exportGraphToMarkdown } from "@/lib/markdown";
import { layoutGraph } from "@/lib/flowLayout";
import { mcpTools } from "../tier1-features/tier1-09-mcp-server-tools.test";

describe("Tier 4: Real-World Application Scenarios", () => {
  it("Scenario 1: Trolley Problem Ethical Dilemma (Utilitarian vs Deontological Derivation)", () => {
    let g: Graph = { nodes: [], edges: [] };

    // Root Dilemma Question
    g = addRootQuestion(g, "Should a bystander pull the switch to divert the trolley from five people onto one person?");
    const qId = g.nodes[0].id;

    // Option A: Pull the switch (Utilitarian derivation)
    g = addNode(g, "claim", "Action: Pull the switch to divert the trolley", qId);
    const actPull = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Diverting results in net 4 lives saved (5 saved vs 1 lost)", actPull);
    const supPull = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "value", "Utilitarian Axiom: Maximize aggregate human welfare and minimize total loss of life", supPull);
    const valUtil = g.nodes[g.nodes.length - 1].id;

    // Option B: Do not pull the switch (Deontological derivation)
    g = addNode(g, "claim", "Action: Refrain from pulling the switch", qId);
    const actRefrain = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Pulling the switch initiates an active lethal intervention against an innocent bystander", actRefrain);
    const supRefrain = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "value", "Deontological Duty: Categorical prohibition against active killing / Doctrine of Double Effect", supRefrain);
    const valDeon = g.nodes[g.nodes.length - 1].id;

    // Dialectical objection: Pulling the switch uses the single person as an instrumental means
    g = addNode(g, "conflict", "Kant's Formula of Humanity: Never treat a human being merely as a means to an end", supPull);
    const objKant = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "bedrock", "Inviolability of moral personhood", objKant);
    const valBed = g.nodes[g.nodes.length - 1].id;

    // Verify Epistemic Graph Metrics
    expect(isNodeGrounded(g, valUtil)).toBe(true);
    expect(isNodeGrounded(g, valDeon)).toBe(true);
    expect(isNodeGrounded(g, supPull)).toBe(true);
    expect(isNodeGrounded(g, supRefrain)).toBe(true);
    expect(isFullyGrounded(g, qId)).toBe(true);

    // Verify Value Clash detection
    const clashes = getValueClashes(g);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].question.id).toBe(qId);
    expect(clashes[0].values.map((v) => v.id).sort()).toEqual([valUtil, valDeon, valBed].sort());

    // Verify Dung Acceptability
    const acc = getAcceptability(g);
    expect(acc.get(objKant)).toBe("coherent");
    expect(acc.get(supPull)).toBe("conflicted");
    expect(acc.get(supRefrain)).toBe("coherent");

    // Verify Status Profile & Layout
    const profile = getStatusProfile(g);
    expect(profile.stats.totalTerminals).toBe(3); // valUtil, valDeon, bedrock
    expect(profile.stats.valueClashes).toBe(1);

    const positions = layoutGraph(g);
    expect(Object.keys(positions)).toHaveLength(9);
  });

  it("Scenario 2: Complex Policy Debate (Carbon Tax & Energy Transition with Citations, Limits, & Preferences)", () => {
    let g: Graph = { nodes: [], edges: [] };

    // Foundational premise
    g = addRootPremise(g, "Anthropogenic greenhouse gas emissions drive global climate risks");
    const premId = g.nodes[0].id;

    // Primary policy claim
    g = addNode(g, "claim", "Implement an economy-wide border-adjusted carbon fee and dividend", premId);
    const policyId = g.nodes[g.nodes.length - 1].id;

    // Support 1: Economic efficiency with empirical citation
    g = addNode(g, "support", "Carbon pricing internalizes the social cost of carbon across supply chains", policyId);
    const supEcon = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://ipcc.ch/report/ar6/wg3/chapter-13-policies", supEcon);
    const srcIpcc = g.nodes[g.nodes.length - 1].id;
    g = verifySource(g, srcIpcc, true);
    g = addNode(g, "bedrock", "Economic agents optimize behavior in response to clear price signals", supEcon);

    // Support 2: Equity via progressive dividend
    g = addNode(g, "support", "Returning 100% of revenues as equal per-capita dividends protects low-income households", policyId);
    const supEquity = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Distributive Justice: Economic policies must not regressively burden vulnerable populations", supEquity);

    // Epistemic limit
    g = addNode(g, "limit", "Uncertain long-term elasticities in heavy industrial decarbonization technologies", policyId);

    // Subjective preference
    g = addNode(g, "preference", "Preference for market-based incentive structures over command-and-control regulation", policyId);

    // Verify Grounding & Structure
    expect(isNodeGrounded(g, premId)).toBe(true);
    expect(isNodeGrounded(g, policyId)).toBe(true);
    expect(isNodeGrounded(g, supEcon)).toBe(true);
    expect(isNodeGrounded(g, supEquity)).toBe(true);

    const stats = getGraphStats(g);
    expect(stats.premises).toBe(1);
    expect(stats.claims).toBe(1);
    expect(stats.supports).toBe(2);
    expect(stats.terminals).toBe(5); // source, bedrock, value, limit, preference (5 total terminals)

    // Export to Markdown and verify rich formatting
    const md = exportGraphToMarkdown(g);
    expect(md).toContain("### [Premise] Anthropogenic greenhouse gas");
    expect(md).toContain("- **[Claim]** Implement an economy-wide border-adjusted carbon fee");
    expect(md).toContain("- **[Source]** https://ipcc.ch/report/ar6/wg3/chapter-13-policies");
  });

  it("Scenario 3: Branching Exploration & Merge Difference Analysis", () => {
    // Master branch baseline
    let masterGraph: Graph = { nodes: [], edges: [] };
    masterGraph = addRootQuestion(masterGraph, "How should healthcare be funded?");
    const qId = masterGraph.nodes[0].id;

    // Fork Branch A: Single-Payer System
    let branchA = { ...masterGraph, nodes: [...masterGraph.nodes], edges: [...masterGraph.edges] };
    branchA = addNode(branchA, "support", "Single-payer monopsony power reduces administrative costs", qId);
    const sA = branchA.nodes[branchA.nodes.length - 1].id;
    branchA = addNode(branchA, "value", "Universal entitlement to medical care", sA);
    const vA = branchA.nodes[branchA.nodes.length - 1].id;

    // Fork Branch B: Market Voucher System
    let branchB = { ...masterGraph, nodes: [...masterGraph.nodes], edges: [...masterGraph.edges] };
    branchB = addNode(branchB, "support", "Competitive insurance markets foster technological innovation", qId);
    const sB = branchB.nodes[branchB.nodes.length - 1].id;
    branchB = addNode(branchB, "value", "Consumer sovereignty and choice", sB);
    const vB = branchB.nodes[branchB.nodes.length - 1].id;

    // Perform Differential Synthesis (Merging both branches into a synthesized comparison map)
    const synthesizedNodes = [...masterGraph.nodes];
    const synthesizedEdges = [...masterGraph.edges];
    const seenNodeIds = new Set(synthesizedNodes.map((n) => n.id));

    for (const node of [...branchA.nodes, ...branchB.nodes]) {
      if (!seenNodeIds.has(node.id)) {
        synthesizedNodes.push(node);
        seenNodeIds.add(node.id);
      }
    }

    const seenEdgeIds = new Set(synthesizedEdges.map((e) => e.id));
    for (const edge of [...branchA.edges, ...branchB.edges]) {
      if (!seenEdgeIds.has(edge.id)) {
        synthesizedEdges.push(edge);
        seenEdgeIds.add(edge.id);
      }
    }

    const mergedGraph: Graph = validateGraph({ nodes: synthesizedNodes, edges: synthesizedEdges });
    expect(mergedGraph.nodes).toHaveLength(5);
    expect(mergedGraph.edges).toHaveLength(4);
    expect(isFullyGrounded(mergedGraph, qId)).toBe(true);

    const clashes = getValueClashes(mergedGraph);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].values.map((v) => v.id).sort()).toEqual([vA, vB].sort());
  });

  it("Scenario 4: Roundtrip Interoperability (JSON, Markdown, & URL Hash Invariance)", () => {
    let original: Graph = { nodes: [], edges: [] };
    original = addRootPremise(original, "Empirical epistemology is foundational");
    const p1 = original.nodes[0].id;

    original = addNode(original, "claim", "Verify all scientific assertions", p1);
    const c1 = original.nodes[original.nodes.length - 1].id;

    original = addNode(original, "support", "Replication crisis necessitates open data", c1);
    const s1 = original.nodes[original.nodes.length - 1].id;

    original = addNode(original, "source", "https://osf.io/research-transparency", s1);
    original = addNode(original, "limit", "Finite research funding limits replication scale", s1);

    // 1. JSON Export -> Parse Roundtrip
    const jsonString = exportGraph(original);
    const restoredFromJson = parseGraph(jsonString);
    expect(restoredFromJson).toEqual(original);

    // 2. Markdown Export Verification
    const mdString = exportGraphToMarkdown(restoredFromJson);
    expect(mdString).toContain("### [Premise] Empirical epistemology is foundational");
    expect(mdString).toContain("- **[Claim]** Verify all scientific assertions");
    expect(mdString).toContain("- **[Source]** https://osf.io/research-transparency");

    // 3. URL Compression -> Decompression Roundtrip
    const compressedUrl = LZString.compressToEncodedURIComponent(jsonString);
    const decompressedJson = LZString.decompressFromEncodedURIComponent(compressedUrl);
    const restoredFromUrl = validateGraph(JSON.parse(decompressedJson!));
    expect(restoredFromUrl).toEqual(original);

    // 4. Grounding Invariance
    expect(isNodeGrounded(restoredFromUrl, c1)).toBe(true);
    expect(isNodeGrounded(restoredFromUrl, s1)).toBe(true);
  });

  it("Scenario 5: Autonomous Agent Dialectic Analysis (MCP Multi-Turn Reasoning Flow)", () => {
    // Turn 1: Agent initializes an empty debate on AGI Alignment
    let agentGraph: Graph = { nodes: [], edges: [] };
    agentGraph = addRootQuestion(agentGraph, "Will formal verification prevent catastrophic AGI misalignment?");
    const rootId = agentGraph.nodes[0].id;

    // Turn 2: Agent queries roots and gaps
    const rootsTurn2 = mcpTools.get_roots(agentGraph);
    expect(rootsTurn2.roots).toHaveLength(1);
    expect(isFullyGrounded(agentGraph, rootId)).toBe(false);

    // Turn 3: Agent proposes a supporting thesis
    const prop1 = mcpTools.propose_node(agentGraph, {
      parentId: rootId,
      type: "support",
      content: "Formal mathematical proofs guarantee bounding constraints on reward optimization",
    });
    expect(prop1.success).toBe(true);
    agentGraph = prop1.graph;
    const supId = prop1.newNodeId;

    // Turn 4: Agent proposes a severe counter-argument (computational intractability)
    const prop2 = mcpTools.propose_node(agentGraph, {
      parentId: supId,
      type: "conflict",
      content: "Rice's Theorem and computational complexity make verifying arbitrary neural behaviors undecidable",
    });
    expect(prop2.success).toBe(true);
    agentGraph = prop2.graph;
    const conId = prop2.newNodeId;

    // Acceptability check: Conflict defeats the support
    let accTurn4 = mcpTools.get_acceptability(agentGraph);
    expect(accTurn4.acceptability[conId]).toBe("coherent");
    expect(accTurn4.acceptability[supId]).toBe("conflicted");

    // Turn 5: Agent defends the thesis with mechanistic interpretability
    const prop3 = mcpTools.propose_node(agentGraph, {
      parentId: conId,
      type: "conflict",
      content: "Bounded circuit auditing and mechanistic interpretability verify safe sub-circuits without full undecidability",
    });
    expect(prop3.success).toBe(true);
    agentGraph = prop3.graph;
    const defId = prop3.newNodeId;

    // Acceptability check: Defender defeats the objection, reinstating the support!
    let accTurn5 = mcpTools.get_acceptability(agentGraph);
    expect(accTurn5.acceptability[defId]).toBe("coherent");
    expect(accTurn5.acceptability[conId]).toBe("conflicted");
    expect(accTurn5.acceptability[supId]).toBe("coherent");

    // Turn 6: Agent grounds the argument in epistemic foundations
    const prop4 = mcpTools.propose_node(agentGraph, {
      parentId: defId,
      type: "limit",
      content: "Epistemic Limit: Proof guarantees apply only within the formal model of the environment",
    });
    expect(prop4.success).toBe(true);
    agentGraph = prop4.graph;

    const prop5 = mcpTools.propose_node(agentGraph, {
      parentId: supId,
      type: "bedrock",
      content: "Mathematical logic is the highest standard of formal verification",
    });
    expect(prop5.success).toBe(true);
    agentGraph = prop5.graph;

    // Final audit
    expect(isFullyGrounded(agentGraph, rootId)).toBe(true);
    const finalGaps = mcpTools.get_grounding_gaps(agentGraph);
    expect(finalGaps.gaps).toHaveLength(0);

    const stats = mcpTools.get_graph(agentGraph).stats;
    expect(stats.claims).toBe(1);
    expect(stats.supports).toBe(1);
    expect(stats.conflicts).toBe(2);
    expect(stats.groundedClaims).toBe(1);
  });
});
