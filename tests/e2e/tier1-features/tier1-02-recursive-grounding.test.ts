import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootQuestion,
  getGroundingGaps,
  getGroundingTerminal,
  isFullyGrounded,
  isNodeGrounded,
  linkToExistingValue,
} from "@/lib/graph";

describe("Tier 1 - Feature 2: Multi-Hop Recursive Grounding", () => {
  it("evaluates a direct grounding edge from claim to a terminal node", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Is suffering bad?");
    const qId = g.nodes[0].id;
    expect(isFullyGrounded(g, qId)).toBe(false);

    // Direct grounding edge
    g = addNode(g, "value", "Axiological bedrock: suffering is bad", qId);
    expect(isFullyGrounded(g, qId)).toBe(true);
    expect(isNodeGrounded(g, qId)).toBe(true);
    expect(getGroundingTerminal(g, qId)?.content).toContain("suffering is bad");
  });

  it("evaluates multi-hop recursive grounding through support arguments down to bedrock", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should we implement carbon tax?");
    const qId = g.nodes[0].id;

    // Hop 1: Support
    g = addNode(g, "support", "Incentivizes emissions reduction", qId);
    const s1Id = g.nodes[g.nodes.length - 1].id;
    expect(isFullyGrounded(g, qId)).toBe(false);
    expect(isNodeGrounded(g, s1Id)).toBe(false);

    // Hop 2: Deeper support
    g = addNode(g, "support", "Economic pricing drives efficient resource allocation", s1Id);
    const s2Id = g.nodes[g.nodes.length - 1].id;
    expect(isFullyGrounded(g, qId)).toBe(false);
    expect(isNodeGrounded(g, s2Id)).toBe(false);

    // Hop 3: Terminal bedrock
    g = addNode(g, "bedrock", "Market participants respond to price signals", s2Id);
    const bId = g.nodes[g.nodes.length - 1].id;

    expect(isNodeGrounded(g, bId)).toBe(true);
    expect(isNodeGrounded(g, s2Id)).toBe(true);
    expect(isNodeGrounded(g, s1Id)).toBe(true);
    expect(isFullyGrounded(g, qId)).toBe(true);
  });

  it("requires all parallel arguments (conjunctive) to be grounded for full claim grounding", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should we construct nuclear power plants?");
    const qId = g.nodes[0].id;

    // Argument 1: Support
    g = addNode(g, "support", "Provides reliable baseload zero-carbon power", qId);
    const s1Id = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Planetary climate stability", s1Id);

    // Argument 2: Conflict (objection that must also be grounded to be fully mapped)
    g = addNode(g, "conflict", "High capital cost and construction delays", qId);
    const c1Id = g.nodes[g.nodes.length - 1].id;

    // Only s1 is grounded; c1 is not grounded yet
    expect(isNodeGrounded(g, s1Id)).toBe(true);
    expect(isNodeGrounded(g, c1Id)).toBe(false);
    expect(isFullyGrounded(g, qId)).toBe(false);

    // Ground argument 2 in an epistemic limit
    g = addNode(g, "limit", "Uncertain regulatory timelines inflate financing costs", c1Id);
    expect(isNodeGrounded(g, c1Id)).toBe(true);
    expect(isFullyGrounded(g, qId)).toBe(true);
  });

  it("accurately detects grounding gaps with getGroundingGaps sorted by depth", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Policy Q");
    const qId = g.nodes[0].id;

    // Shallow ungrounded argument (depth 1)
    g = addNode(g, "support", "Shallow argument", qId);
    const s1Id = g.nodes[g.nodes.length - 1].id;

    // Deeper ungrounded argument (depth 2)
    g = addNode(g, "support", "Deep argument", s1Id);
    const s2Id = g.nodes[g.nodes.length - 1].id;

    // Sibling ungrounded argument on root (depth 1)
    g = addNode(g, "conflict", "Alternative objection", qId);
    const c1Id = g.nodes[g.nodes.length - 1].id;

    const gaps = getGroundingGaps(g);
    expect(gaps).toHaveLength(3);
    expect(gaps.some((g) => g.node.id === s1Id)).toBe(true);
    expect(gaps.some((g) => g.node.id === s2Id)).toBe(true);
    expect(gaps.some((g) => g.node.id === c1Id)).toBe(true);

    // Grounding s2 grounds both s2 and its ancestor s1, leaving only c1 ungrounded
    g = addNode(g, "value", "Core value", s2Id);
    const updatedGaps = getGroundingGaps(g);
    expect(updatedGaps).toHaveLength(1);
    expect(updatedGaps[0].node.id).toBe(c1Id);
  });

  it("handles value convergence where multiple arguments ground in the same terminal", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Claim A");
    const qA = g.nodes[0].id;
    g = addRootQuestion(g, "Claim B");
    const qB = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Arg A", qA);
    const argA = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "support", "Arg B", qB);
    const argB = g.nodes[g.nodes.length - 1].id;

    // Create terminal under Arg A
    g = addNode(g, "value", "Shared fundamental value: Human flourishing", argA);
    const valId = g.nodes[g.nodes.length - 1].id;

    // Link Arg B to the existing terminal value
    g = linkToExistingValue(g, argB, valId);

    expect(isNodeGrounded(g, argA)).toBe(true);
    expect(isNodeGrounded(g, argB)).toBe(true);
    expect(isFullyGrounded(g, qA)).toBe(true);
    expect(isFullyGrounded(g, qB)).toBe(true);

    const termA = getGroundingTerminal(g, argA);
    const termB = getGroundingTerminal(g, argB);
    expect(termA?.id).toBe(valId);
    expect(termB?.id).toBe(valId);
  });
});
