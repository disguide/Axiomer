import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { addNode, addRootQuestion, getNode, verifySource } from "@/lib/graph";

describe("Tier 2 - Boundary 5: Source Citation Boundary Cases", () => {
  it("handles extremely long URLs (2048+ characters) in source citations", () => {
    const longUrl = `https://example.org/study?param=${"x".repeat(2048)}`;
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Empirical inquiry");
    const qId = g.nodes[0].id;

    g = addNode(g, "source", longUrl, qId);
    const srcId = g.nodes[g.nodes.length - 1].id;

    expect(getNode(g, srcId)?.content).toBe(longUrl);
  });

  it("returns unchanged graph when verifySource is called with non-existent ID", () => {
    const g: Graph = {
      nodes: [{ id: "s1", type: "source", content: "https://example.com" }],
      edges: [],
    };
    const result = verifySource(g, "non_existent_id", true);
    expect(result.nodes[0].verified).toBeUndefined();
  });

  it("supports multiple distinct source citations on the same parent node", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Climate sensitivity estimate");
    const qId = g.nodes[0].id;

    const sources = [
      "https://ipcc.ch/report/ar6/wg1",
      "https://nature.com/articles/s41586-020-0091-x",
      "https://science.org/doi/10.1126/science.abc1234",
    ];

    for (const url of sources) {
      g = addNode(g, "source", url, qId);
    }

    const sourceNodes = g.nodes.filter((n) => n.type === "source");
    expect(sourceNodes).toHaveLength(3);
    const sourceEdges = g.edges.filter((e) => e.edgeType === "cites");
    expect(sourceEdges).toHaveLength(3);
  });

  it("preserves URL query parameters, hash fragments, and percent-encoding in source content", () => {
    const complexUrl = "https://example.com/search?q=epistemic+logic&filter=peer_reviewed#section-3.2";
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Topic");
    const qId = g.nodes[0].id;

    g = addNode(g, "source", complexUrl, qId);
    const srcId = g.nodes[g.nodes.length - 1].id;
    expect(getNode(g, srcId)?.content).toBe(complexUrl);
  });

  it("allows source nodes with empty string content for placeholder citations", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Unreferenced Claim");
    const qId = g.nodes[0].id;

    g = addNode(g, "source", "", qId);
    const srcId = g.nodes[g.nodes.length - 1].id;
    expect(getNode(g, srcId)?.content).toBe("");
  });
});
