import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { exportGraph, parseGraph } from "@/lib/io";
import { exportGraphToMarkdown } from "@/lib/markdown";
import { addNode, addRootPremise, addRootQuestion } from "@/lib/graph";

describe("Tier 1 - Feature 7: Bidirectional JSON & Markdown I/O", () => {
  it("serializes and parses graph to/from JSON preserving complete structure and attributes", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should we terraform Mars?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Creates multi-planetary redundancy for civilization", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Long-term survival of consciousness", sId);
    g = addNode(g, "source", "https://planetary.org/mars-report", sId);

    const exported = exportGraph(g);
    expect(typeof exported).toBe("string");
    expect(exported).toContain("Should we terraform Mars?");
    expect(exported).toContain("Long-term survival");

    const parsed = parseGraph(exported);
    expect(parsed.nodes).toHaveLength(4);
    expect(parsed.edges).toHaveLength(3);
    expect(parsed).toEqual(g);
  });

  it("strictly validates JSON schema and throws informative errors on invalid node types", () => {
    const invalidNodeType = JSON.stringify({
      nodes: [{ id: "n1", type: "invalid_type_abc", content: "test" }],
      edges: [],
    });
    expect(() => parseGraph(invalidNodeType)).toThrow(/not a valid NodeType/);
  });

  it("strictly validates JSON schema and throws errors on invalid edge types", () => {
    const invalidEdgeType = JSON.stringify({
      nodes: [
        { id: "n1", type: "claim", content: "A" },
        { id: "n2", type: "support", content: "B" },
      ],
      edges: [{ id: "e1", from: "n2", to: "n1", edgeType: "invalid_edge_xyz" }],
    });
    expect(() => parseGraph(invalidEdgeType)).toThrow(/not a valid EdgeType/);
  });

  it("enforces referential integrity on edge endpoints (throws if from/to node is missing)", () => {
    const danglingEdge = JSON.stringify({
      nodes: [{ id: "n1", type: "claim", content: "A" }],
      edges: [{ id: "e1", from: "non_existent_node", to: "n1", edgeType: "supports" }],
    });
    expect(() => parseGraph(danglingEdge)).toThrow(/has no node/);
  });

  it("exports graph to structured Markdown with headers and nested bullet points", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Is open-source AI safer?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Decentralized red-teaming finds vulnerabilities faster", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Scientific transparency and accountability", sId);

    const md = exportGraphToMarkdown(g);
    expect(md).toContain("### [Claim] Is open-source AI safer?");
    expect(md).toContain("- **[Support]** Decentralized red-teaming finds vulnerabilities faster");
    expect(md).toContain("- **[Value]** Scientific transparency and accountability");
  });

  it("handles empty graphs and multiple roots in Markdown export", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    expect(exportGraphToMarkdown(emptyGraph)).toBe("*Empty graph*");

    let multiRoot: Graph = { nodes: [], edges: [] };
    multiRoot = addRootQuestion(multiRoot, "Question 1");
    multiRoot = addRootPremise(multiRoot, "Premise 1");

    const md = exportGraphToMarkdown(multiRoot);
    expect(md).toContain("### [Claim] Question 1");
    expect(md).toContain("---");
    expect(md).toContain("### [Premise] Premise 1");
  });
});
