import { describe, expect, it } from "vitest";
import * as LZString from "lz-string";
import type { Graph } from "@/lib/types";
import { migrateGraph } from "@/lib/types";
import { addNode, addRootQuestion } from "@/lib/graph";
import { isReadOnly } from "@/lib/dataSource";

describe("Tier 1 - Feature 8: URL Hash Sharing & Read-only Mode", () => {
  it("compresses graph into URL-safe encoded URI component and decompresses with 100% fidelity", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Should AI systems be autonomous?");
    const qId = g.nodes[0].id;
    g = addNode(g, "support", "Higher efficiency in complex real-time tasks", qId);
    const sId = g.nodes[g.nodes.length - 1].id;
    g = addNode(g, "value", "Economic productivity", sId);

    const json = JSON.stringify(g);
    const compressed = LZString.compressToEncodedURIComponent(json);
    expect(typeof compressed).toBe("string");
    expect(compressed.length).toBeGreaterThan(0);

    // Decompress
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    expect(decompressed).toBe(json);

    const restored: Graph = JSON.parse(decompressed!);
    expect(restored).toEqual(g);
  });

  it("constructs and parses realistic URL hash share links (#tree=...)", () => {
    let g: Graph = { nodes: [], edges: [] };
    g = addRootQuestion(g, "Shareable reasoning map");
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(g));

    const shareUrl = `https://axiomer.app/#tree=${compressed}`;
    const hash = shareUrl.split("#")[1];
    expect(hash.startsWith("tree=")).toBe(true);

    const rawPayload = hash.substring(5);
    const decodedJson = LZString.decompressFromEncodedURIComponent(rawPayload);
    const decodedGraph: Graph = JSON.parse(decodedJson!);
    expect(decodedGraph.nodes[0].content).toBe("Shareable reasoning map");
  });

  it("validates read-only mode detection function isReadOnly()", () => {
    // In node test environment without VITE_PUBLIC_READONLY=1 set, isReadOnly() returns false
    expect(typeof isReadOnly()).toBe("boolean");
    expect(isReadOnly()).toBe(false);
  });

  it("migrates legacy graph format when decoded from shared URL hash", () => {
    const legacyGraph = {
      nodes: [
        { id: "q1", type: "question", content: "Old question format" },
        { id: "p1", type: "position", content: "Old position format" },
      ],
      edges: [{ id: "e1", from: "p1", to: "q1", edgeType: "answers" }],
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(legacyGraph));
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    const parsed = JSON.parse(decompressed!);
    const migrated = migrateGraph(parsed);

    expect(migrated.nodes[0].type).toBe("claim");
    expect(migrated.nodes[1].type).toBe("claim");
    expect(migrated.edges[0].edgeType).toBe("supports");
  });

  it("gracefully handles corrupted URL hash payload without unhandled throw", () => {
    const corruptedHash = "InvalidEncodedComponent_12345!@#$%^&*";
    const decompressed = LZString.decompressFromEncodedURIComponent(corruptedHash);

    // Decompressing junk either returns null or invalid JSON string
    if (decompressed) {
      expect(() => JSON.parse(decompressed)).toThrow();
    } else {
      expect(decompressed).toBeNull();
    }
  });
});
