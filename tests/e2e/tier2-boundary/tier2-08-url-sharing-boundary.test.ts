import { describe, expect, it } from "vitest";
import * as LZString from "lz-string";
import type { Graph, GraphEdge, GraphNode } from "@/lib/types";

describe("Tier 2 - Boundary 8: URL Sharing Boundary Cases", () => {
  it("compresses and decompresses an empty graph payload reliably", () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    const json = JSON.stringify(emptyGraph);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    expect(decompressed).toBe(json);
    expect(JSON.parse(decompressed!)).toEqual(emptyGraph);
  });

  it("compresses a 100-node graph payload producing a valid URL-safe string", () => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    for (let i = 0; i < 100; i++) {
      nodes.push({ id: `n_${i}`, type: "claim", content: `Belief statement ${i}` });
    }
    const g: Graph = { nodes, edges };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));

    // URL-safe string should not contain unencoded spaces or forbidden characters
    expect(compressed).not.toMatch(/\s/);
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    expect(JSON.parse(decompressed!).nodes).toHaveLength(100);
  });

  it("preserves URL reserved characters (?, &, #, /, =, +) embedded in node text", () => {
    const g: Graph = {
      nodes: [
        {
          id: "n1",
          type: "claim",
          content: "Why? & How? Check #hash and path/to/resource with a+b=c & x%20y",
        },
      ],
      edges: [],
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const restored = JSON.parse(decompressed!);
    expect(restored.nodes[0].content).toBe(g.nodes[0].content);
  });

  it("handles non-Latin Unicode, emoji, and multi-byte UTF-16 code points in URL compression", () => {
    const g: Graph = {
      nodes: [
        {
          id: "n1",
          type: "claim",
          content: "日本語のテキスト 🌟 𝓔𝓹𝓲𝓼𝓽𝓮𝓶𝓲𝓬 𝕽𝖊𝖆𝖘𝖔𝖓𝖎𝖓𝖌 \u00A9 \u221E",
        },
      ],
      edges: [],
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const restored = JSON.parse(decompressed!);
    expect(restored.nodes[0].content).toBe(g.nodes[0].content);
  });

  it("returns null or unparseable on truncated/partially corrupted compressed strings", () => {
    const g: Graph = { nodes: [{ id: "n1", type: "claim", content: "Test" }], edges: [] };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));
    const truncated = compressed.substring(0, Math.floor(compressed.length / 2));

    const decompressed = LZString.decompressFromEncodedURIComponent(truncated);
    // Decompression of truncated component fails safely
    if (decompressed !== null) {
      expect(() => JSON.parse(decompressed)).toThrow();
    } else {
      expect(decompressed).toBeNull();
    }
  });
});
