import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/types";
import { addNode, addRootQuestion, edgeTypeFor, getNode } from "@/lib/graph";
import { ALLOWED_CHILDREN } from "@/lib/meta";

describe("Tier 2 - Boundary 1: Ontology & Edge Types Boundary Cases", () => {
  it("handles empty and whitespace-only content strings across node types", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "");
    const qId = g.nodes[0].id;
    expect(getNode(g, qId)?.content).toBe("");

    g = addNode(g, "support", "   \n\t  ", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    expect(getNode(g, sId)?.content).toBe("   \n\t  ");
  });

  it("handles extremely long content strings (10,000+ characters) without data corruption", () => {
    const hugeText = "A".repeat(12000);
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, hugeText);
    const qId = g.nodes[0].id;
    expect(getNode(g, qId)?.content.length).toBe(12000);
  });

  it("preserves complex Unicode, emojis, RTL characters, and math symbols in node content", () => {
    const unicodeText = "🔬 Truth & Coherence: 𝒫 ⇒ 𝒬 ∧ ¬𝒬 ⊥ | שלום | مرحبا | 🚀\nLine 2";
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, unicodeText);
    const qId = g.nodes[0].id;
    expect(getNode(g, qId)?.content).toBe(unicodeText);
  });

  it("verifies edgeTypeFor handles undefined parentType gracefully", () => {
    expect(edgeTypeFor("support")).toBe("supports");
    expect(edgeTypeFor("conflict")).toBe("conflicts");
    expect(edgeTypeFor("source")).toBe("cites");
    expect(edgeTypeFor("value")).toBe("grounds");
    expect(edgeTypeFor("limit")).toBe("grounds");
    expect(edgeTypeFor("bedrock")).toBe("grounds");
    expect(edgeTypeFor("preference")).toBe("grounds");
    expect(edgeTypeFor("note")).toBe("annotates");
  });

  it("verifies terminal node allowed children array is strictly frozen/empty", () => {
    expect(ALLOWED_CHILDREN.value).toHaveLength(0);
    expect(ALLOWED_CHILDREN.source).toHaveLength(0);
    expect(ALLOWED_CHILDREN.limit).toHaveLength(0);
    expect(ALLOWED_CHILDREN.bedrock).toHaveLength(0);
    expect(ALLOWED_CHILDREN.preference).toHaveLength(0);
  });
});
