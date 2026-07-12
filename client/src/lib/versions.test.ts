import { describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import { seedGraph } from "./seed";
import * as G from "./graph";
import { diffGraphs, summarizeDiff } from "./versions";
import { buildShareUrl, decodeGraphShare, parseShareHash } from "./share";

const lastId = (g: typeof seedGraph) => g.nodes[g.nodes.length - 1].id;

describe("diffGraphs", () => {
  it("reports identical graphs as identical", () => {
    const diff = diffGraphs(seedGraph, seedGraph);
    expect(diff.identical).toBe(true);
    expect(summarizeDiff(diff)).toBe("no changes");
  });

  it("detects added nodes and edges", () => {
    let g = G.addRootQuestion(seedGraph, "New Q");
    const qid = lastId(g);
    g = G.addNode(g, "position", "New P", qid);
    const diff = diffGraphs(seedGraph, g);
    expect(diff.addedNodes.map((n) => n.content).sort()).toEqual(["New P", "New Q"]);
    expect(diff.addedEdges).toHaveLength(1);
    expect(diff.removedNodes).toHaveLength(0);
    expect(diff.identical).toBe(false);
  });

  it("detects removals (deletion cascades) and edits", () => {
    let g = G.deleteNode(seedGraph, "trolley-p1");
    g = G.editNode(g, "trolley-p3", "Do not pull — persons are not means");
    const diff = diffGraphs(seedGraph, g);
    expect(diff.removedNodes.map((n) => n.id)).toContain("trolley-p1");
    expect(diff.removedNodes.map((n) => n.id)).toContain("trolley-a1");
    const change = diff.changedNodes.find((c) => c.before.id === "trolley-p3");
    expect(change?.fields).toEqual(["content"]);
  });

  it("treats a status change as an edit, not a removal", () => {
    const g = G.setNodeStatus(seedGraph, "trolley-a3", "retracted");
    const diff = diffGraphs(seedGraph, g);
    expect(diff.removedNodes).toHaveLength(0);
    const change = diff.changedNodes.find((c) => c.before.id === "trolley-a3");
    expect(change?.fields).toContain("status");
  });

  it("compares edges structurally, ignoring generated ids", () => {
    const relabeled = {
      nodes: seedGraph.nodes,
      edges: seedGraph.edges.map((e) => ({ ...e, id: `other_${e.id}` })),
    };
    expect(diffGraphs(seedGraph, relabeled).identical).toBe(true);
  });
});

describe("share links", () => {
  it("round-trips the seed graph through a share link", () => {
    const url = buildShareUrl(seedGraph, "https://axiomer.example/app#old");
    expect(url).toMatch(/https:\/\/axiomer\.example\/app#g=/);
    const hash = `#${url.split("#")[1]}`;
    const restored = parseShareHash(hash);
    expect(restored).toEqual(seedGraph);
  });

  it("returns null for non-share hashes and rejects corrupted payloads", () => {
    expect(parseShareHash("#something-else")).toBeNull();
    expect(parseShareHash("")).toBeNull();
    expect(() => decodeGraphShare("not-a-real-payload")).toThrow(/corrupted|JSON/);
  });

  it("rejects a decodable payload that isn't a valid graph (io.ts gate)", () => {
    const bogus = compressToEncodedURIComponent(
      JSON.stringify({
        nodes: [{ id: "x", type: "banana", content: "y" }],
        edges: [],
      }),
    );
    expect(() => decodeGraphShare(bogus)).toThrow(/not a valid NodeType/);
  });
});
