import { describe, expect, it } from "vitest";
import {
  addThought,
  diffRoadmaps,
  exampleGraph,
  hasRoadmapChanges,
  importRoadmap,
  rebaseRoadmap,
  validateRoadmap,
  validateSources,
  type Roadmap,
  type Source,
} from "./model";
import { readDrafts, STORAGE_KEY } from "./storage";

const source: Source = {
  id: "evidence-1",
  title: "The supporting passage",
  url: "https://example.org/research#section-2",
  locator: "Section 2, paragraph 3",
};
function cited(graph: Roadmap, sources: Source[] = [source]): Roadmap {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === "a" ? { ...n, sources } : n)),
  };
}

describe("author-supplied evidence", () => {
  it("preserves stable evidence through JSON import, local recovery and normal edits", () => {
    const graph = validateRoadmap(cited(exampleGraph()));
    const roundTrip = importRoadmap(JSON.parse(JSON.stringify({ title: "Cited", graph })));
    expect(roundTrip.nodes.find((n) => n.id === "a")?.sources).toEqual([source]);
    const raw = JSON.stringify({ drafts: [{ id: "draft", title: "Cited", graph, updated: "2026-10-27" }], activeDraftId: "draft" });
    const restored = readDrafts({ getItem: (key) => key === STORAGE_KEY ? raw : null });
    expect(restored.error).toBeNull();
    expect(restored.drafts[0].graph.nodes.find((n) => n.id === "a")?.sources).toEqual([source]);
    expect(addThought(graph, "Continue", "a", null, "next").nodes.find((n) => n.id === "a")?.sources).toEqual([source]);
    const legacy = importRoadmap({ nodes: [{ id: "value", type: "value", content: "Care" }], edges: [] });
    expect(legacy.nodes[0]).toEqual({ id: "value", text: "Care", kind: "value" });
  });

  it.each([
    "javascript:alert(1)", "data:text/html,hello", "file:///etc/passwd", "ftp://example.org/file",
    "/relative", "not a url", "https://user:pass@example.org/research", "https://user@example.org/research",
    "https://exam\nple.org", "https://example.org/a b", "https://",
  ])("refuses unsafe or malformed evidence URL %s", (url) => {
    expect(() => validateSources([{ ...source, url }])).toThrow("Source URL");
  });

  it("accepts HTTP(S), normalizes surrounding space and refuses malformed metadata", () => {
    expect(validateSources([{ ...source, title: "  Title  ", url: " http://example.org ", locator: "  p. 2  " }])).toEqual([
      { ...source, title: "Title", url: "http://example.org/", locator: "p. 2" },
    ]);
    expect(() => validateSources([source, source])).toThrow("Duplicate source");
    expect(() => validateSources(Array.from({ length: 21 }, (_, i) => ({ ...source, id: String(i) })))).toThrow("20 sources");
    expect(() => validateSources([{ ...source, title: " " }])).toThrow("Source title");
    expect(() => validateSources([{ ...source, locator: "x".repeat(501) }])).toThrow("location");
    expect(() => validateSources(null)).toThrow("20 sources");
    expect(validateSources(undefined)).toEqual([]);
  });

  it("makes adding, changing and removing evidence visible without fake text edits", () => {
    const base = exampleGraph(), withSource = cited(base);
    expect(diffRoadmaps(base, withSource).edited.map((n) => n.after.id)).toEqual(["a"]);
    expect(hasRoadmapChanges(base, withSource)).toBe(true);
    expect(diffRoadmaps(withSource, cited(base, [{ ...source, locator: "p. 9" }])).edited).toHaveLength(1);
    expect(diffRoadmaps(withSource, base).edited[0].before.sources).toEqual([source]);
    expect(hasRoadmapChanges(base, cited(base, []))).toBe(false);
    expect(hasRoadmapChanges(withSource, cited(base, [{ ...source, title: "New evidence title" }]))).toBe(true);
  });

  it("requires explicit choices for concurrent source-only changes and preserves chosen evidence", () => {
    const base = cited(exampleGraph());
    const ours = cited(base, [{ ...source, title: "Contributor source" }]);
    const latest = cited(base, [{ ...source, title: "Owner source" }]);
    const before = JSON.stringify([base, ours, latest]);
    const unresolved = rebaseRoadmap(base, ours, latest);
    expect(unresolved.graph).toBeNull();
    expect(unresolved.conflicts).toHaveLength(1);
    expect(unresolved.conflicts[0].key).toBe("thought:a");
    expect(unresolved.conflicts[0].choice).toBeUndefined();
    const chosen = rebaseRoadmap(base, ours, latest, { "thought:a": "proposed" });
    expect(chosen.graph?.nodes.find((n) => n.id === "a")?.sources?.[0].title).toBe("Contributor source");
    const keepOwner = rebaseRoadmap(base, ours, latest, { "thought:a": "latest" });
    expect(keepOwner.graph?.nodes.find((n) => n.id === "a")?.sources?.[0].title).toBe("Owner source");
    expect(JSON.stringify([base, ours, latest])).toBe(before);
  });

  it("combines evidence updates with unrelated owner work and rejects unsafe saved graphs", () => {
    const base = exampleGraph(), ours = cited(base);
    const latest = addThought(base, "Another branch", "v", null, "owner-branch");
    const merged = rebaseRoadmap(base, ours, latest);
    expect(merged.conflicts).toEqual([]);
    expect(merged.graph?.nodes.find((n) => n.id === "a")?.sources).toEqual([source]);
    expect(merged.graph?.nodes.some((n) => n.id === "owner-branch")).toBe(true);
    const unsafe = cited(base, [{ ...source, url: "javascript:alert(1)" }]);
    const broken = readDrafts({ getItem: () => JSON.stringify([{ id: "d", title: "Bad", updated: "date", graph: unsafe }]) });
    expect(broken.error).toMatch(/not been overwritten/);
    expect(() => importRoadmap(unsafe)).toThrow("Source URL");
  });
});
