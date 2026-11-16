import { describe, it, expect } from "vitest";
import { makeSnapshot, snapshotLink, snapshotFromHash, parseSnapshot, validateProfile } from "./sharing";
const graph = { nodes: [{ id: "a", type: "claim" as const, content: "Should we change?" }], edges: [] };
describe("shareable snapshots", () => {
  it("round-trips a separate read-only payload without implicit personal context", () => {
    const snapshot = makeSnapshot(graph, "A decision");
    expect(snapshot).not.toHaveProperty("profile");
    const link = snapshotLink(snapshot, "https://example.test");
    expect(snapshotFromHash(new URL(link).hash)).toEqual(snapshot);
    expect(graph.nodes[0].content).toBe("Should we change?");
  });
  it("includes a profile only on explicit request and supports older files", () => {
    const profile = { values: ["Care"], beliefs: ["People can change"], personality: "I prefer quiet reflection" };
    expect(makeSnapshot(graph, "A", profile).profile).toEqual(profile);
    expect(parseSnapshot(JSON.stringify(graph)).graph).toEqual(graph);
    expect(() => validateProfile({ ...profile, values: "invalid" })).toThrow();
  });
  it("rejects broken links, malformed graphs and oversized snapshots", () => {
    expect(() => snapshotFromHash("#tree=bad")).toThrow();
    expect(() => parseSnapshot(JSON.stringify({ version: 1, title: "Bad", graph: { nodes: [], edges: [{ id: "e", from: "x", to: "y", edgeType: "supports" }] } }))).toThrow();
    let seed = 4711;
    const text = () => Array.from({ length: 1000 }, () => { seed = (seed * 16807) % 2147483647; return String.fromCharCode(33 + seed % 90); }).join("");
    const huge = makeSnapshot({ nodes: Array.from({ length: 64 }, (_, i) => ({ id: `n${i}`, type: "claim", content: text() })), edges: [] }, "Big");
    expect(() => snapshotLink(huge, "https://example.test")).toThrow("snapshot file");
  });
});
