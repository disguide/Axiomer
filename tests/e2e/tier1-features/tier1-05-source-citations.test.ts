import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import {
  addNode,
  addRootPremise,
  addRootQuestion,
  deleteNode,
  edgeEndpoints,
  getChildren,
  getNode,
  verifySource,
} from "@/lib/graph";
import { NODE_META } from "@/lib/meta";

describe("Tier 1 - Feature 5: Source Citation Grounding", () => {
  it("creates source nodes with cites edge type running parent→child", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Vaccines reduce transmission");
    const qId = g.nodes[0].id;

    g = addNode(g, "support", "Randomized controlled trial data shows 90% efficacy", qId);
    const supId = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "source", "https://nejm.org/doi/full/10.1056/NEJMoa2034577", supId);
    const srcId = g.nodes[g.nodes.length - 1].id;
    const srcNode = getNode(g, srcId);

    expect(srcNode?.type).toBe("source");
    expect(srcNode?.content).toBe("https://nejm.org/doi/full/10.1056/NEJMoa2034577");

    const edge = g.edges.find((e) => e.from === srcId || e.to === srcId)!;
    expect(edge.edgeType).toBe("cites");
    expect(edge.from).toBe(supId);
    expect(edge.to).toBe(srcId);
    expect(edgeEndpoints(edge)).toEqual({ parent: supId, child: srcId });
  });

  it("immutably updates verified status on source nodes via verifySource", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Scientific inquiry");
    const qId = g.nodes[0].id;

    g = addNode(g, "source", "https://nature.com/articles/12345", qId);
    const srcId = g.nodes[g.nodes.length - 1].id;
    expect(getNode(g, srcId)?.verified).toBeUndefined();

    // Verify source
    const verifiedGraph = verifySource(g, srcId, true);
    expect(getNode(verifiedGraph, srcId)?.verified).toBe(true);
    expect(getNode(g, srcId)?.verified).toBeUndefined(); // Original unmutated

    // Unverify source
    const unverifiedGraph = verifySource(verifiedGraph, srcId, false);
    expect(getNode(unverifiedGraph, srcId)?.verified).toBe(false);
  });

  it("attaches source citations to claims, premises, supports, and notes", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootPremise(g, "Empirical data is informative");
    const premId = g.nodes[0].id;
    g = addNode(g, "source", "https://doi.org/premise-source", premId);
    const srcPrem = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "claim", "Smoking causes lung cancer", premId);
    const claimId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://cdc.gov/tobacco/data", claimId);
    const srcClaim = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "support", "Epidemiological cohort studies over 50 years", claimId);
    const supId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://who.int/cancer/report", supId);
    const srcSup = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "note", "Adjusted for confounding socio-economic variables", supId);
    const noteId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "source", "https://stats.org/methodology", noteId);
    const srcNote = g.nodes[g.nodes.length - 1].id;

    expect(getChildren(g, premId).map((n) => n.id)).toContain(srcPrem);
    expect(getChildren(g, claimId).map((n) => n.id)).toContain(srcClaim);
    expect(getChildren(g, supId).map((n) => n.id)).toContain(srcSup);
    expect(getChildren(g, noteId).map((n) => n.id)).toContain(srcNote);
  });

  it("cascades deletion properly when removing a node with cited sources", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Debate");
    const qId = g.nodes[0].id;

    g = addNode(g, "support", "Argument with source", qId);
    const supId = g.nodes[g.nodes.length - 1].id;

    g = addNode(g, "source", "https://example.com/source", supId);
    const srcId = g.nodes[g.nodes.length - 1].id;

    expect(getNode(g, srcId)).toBeDefined();
    const afterDelete = deleteNode(g, supId);

    expect(getNode(afterDelete, supId)).toBeUndefined();
    expect(getNode(afterDelete, srcId)).toBeUndefined();
    expect(afterDelete.edges.some((e) => e.from === srcId || e.to === srcId)).toBe(false);
  });

  it("contains complete metadata definition for source in NODE_META", () => {
    const meta = NODE_META["source"];
    expect(meta.label).toBe("Source");
    expect(meta.terminal).toBe(true);
    expect(meta.color).toBe("#0d9488"); // teal-600
    expect(meta.description).toContain("citation");
    expect(meta.prompt).toBe("What is the source?");
  });
});
