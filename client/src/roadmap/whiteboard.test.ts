import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeSummary, MergeVersion } from "./Review";
import { addThought, approveSuggestion, diffRoadmaps, exampleGraph, hasRoadmapChanges, importRoadmap, rebaseRoadmap, removeThought, validateRoadmap, type Roadmap } from "./model";
import { readDrafts, STORAGE_KEY } from "./storage";
import { validateWhiteboard, whiteboardMeaning, type WhiteboardAnnotation } from "./whiteboard";

const rectangle = (id = "drawing-1", point = [20, 40]): WhiteboardAnnotation => ({
  id, type: "rectangle", parentId: "page", childIndex: 1, name: "Rectangle", point,
  size: [120, 80], rotation: 0, style: { color: "blue", size: "small", dash: "solid" },
});
const drawing = (id = "pen-1"): WhiteboardAnnotation => ({
  id, type: "draw", parentId: "page", childIndex: 2, name: "Draw", point: [80, 20],
  points: [[0, 0, .5], [12, 14, .8], [23, 5, .2]], isComplete: true,
  style: { color: "black", size: "medium", dash: "draw" },
});
const board = (shapes: WhiteboardAnnotation[]): Roadmap => validateRoadmap({ ...exampleGraph(), whiteboard: shapes });

describe("reviewable drawing layer", () => {
  it("keeps legacy schema2 exact, and round-trips drawings with sources and old semantic directions", () => {
    const legacy = exampleGraph();
    expect(validateRoadmap(legacy)).toEqual(legacy);
    expect(validateRoadmap({ ...legacy, whiteboard: [] })).toEqual(legacy);
    const graph = board([rectangle(), drawing()]);
    graph.nodes[0].sources = [{ id: "source", title: "Paper", url: "https://example.org/paper", locator: "p.3" }];
    graph.edges[0].semantic = { from: graph.edges[0].to, to: graph.edges[0].from, type: "supports" };
    const imported = importRoadmap(JSON.parse(JSON.stringify(graph)));
    expect(imported).toEqual(graph);
    const raw = JSON.stringify({ drafts: [{ id: "draft", title: "Board", graph, updated: "2026-11-06" }], activeDraftId: "draft" });
    expect(readDrafts({ getItem: key => key === STORAGE_KEY ? raw : null }).drafts[0].graph).toEqual(graph);
  });

  it("preserves drawings through added thoughts and individually approved AI steps", () => {
    const original = board([drawing()]);
    const continued = addThought(original, "An alternative", original.anchor, null, "alternative");
    expect(continued.whiteboard).toEqual(original.whiteboard);
    const approved = approveSuggestion(continued, { id: "ai-step", text: "A reviewed continuation", parentId: "alternative", kind: null, rationale: "Review", excerpt: "", status: "pending" });
    expect(approved.whiteboard).toEqual(original.whiteboard);
    expect(original.nodes.some(n => n.id === "ai-step")).toBe(false);
  });

  it("shows drawing-only edits, deletion, color and decoration changes in correction review", () => {
    const before = board([rectangle()]);
    const after = board([rectangle("drawing-1", [500, 600]), drawing()]);
    expect(diffRoadmaps(before, after).whiteboardChanged).toBe(true);
    expect(hasRoadmapChanges(before, after)).toBe(true);
    expect(diffRoadmaps(before, after).edited).toHaveLength(0);
    const html = renderToStaticMarkup(createElement(ChangeSummary, { before, after }));
    expect(html).toContain("Drawing layer changed");
    expect(html).toContain("Drawing layer preview");
    expect(html).toContain("Drawing details");
    expect(hasRoadmapChanges(after, { ...after, whiteboard: [] })).toBe(true);
    expect(hasRoadmapChanges(exampleGraph(), { ...exampleGraph(), whiteboard: [] })).toBe(false);
    const changed = structuredClone(before);
    changed.whiteboard![0].style.color = "red";
    expect(hasRoadmapChanges(before, changed)).toBe(true);
  });

  it("combines a one-sided drawing edit with someone else's reasoning edit", () => {
    const base = board([rectangle()]);
    const proposed = board([rectangle(), drawing()]);
    const latest = structuredClone(base); latest.nodes[0].text = "A clearer starting value";
    const result = rebaseRoadmap(base, proposed, latest);
    expect(result.error).toBeNull(); expect(result.conflicts).toEqual([]);
    expect(result.graph!.whiteboard).toEqual(proposed.whiteboard);
    expect(result.graph!.nodes[0].text).toBe(latest.nodes[0].text);
  });

  it("requires an explicit atomic layer choice for competing drawing edits and deletion", () => {
    const base = board([rectangle()]);
    const proposed = board([drawing()]);
    const latest = board([rectangle("drawing-1", [900, 400])]);
    const originalSnapshots = JSON.stringify([base, proposed, latest]);
    const unresolved = rebaseRoadmap(base, proposed, latest);
    expect(unresolved.graph).toBeNull();
    expect(unresolved.conflicts).toMatchObject([{ key: "whiteboard:drawing", kind: "whiteboard", choice: undefined }]);
    expect(rebaseRoadmap(base, proposed, latest, { "whiteboard:drawing": "proposed" }).graph!.whiteboard).toEqual(proposed.whiteboard);
    expect(rebaseRoadmap(base, proposed, latest, { "whiteboard:drawing": "latest" }).graph!.whiteboard).toEqual(latest.whiteboard);
    expect(rebaseRoadmap(base, { ...proposed, whiteboard: [] }, latest).graph).toBeNull();
    expect(rebaseRoadmap(base, { ...proposed, whiteboard: [] }, latest, { "whiteboard:drawing": "proposed" }).graph!.whiteboard).toBeUndefined();
    expect(JSON.stringify([base, proposed, latest])).toBe(originalSnapshots);
    expect(renderToStaticMarkup(createElement(MergeVersion, { value: proposed.whiteboard!, graph: proposed }))).toContain("Drawing layer preview");
  });

  it("accepts supported primitive geometry, preserving plain text without executing it", () => {
    const common = rectangle();
    const raw = [
      { ...common, id: "text", type: "text", size: undefined, text: "<script>alert(1)</script>" },
      { ...common, id: "ellipse", type: "ellipse", size: undefined, radius: [30, 40] },
      { ...common, id: "triangle", type: "triangle" },
      { ...common, id: "sticky", type: "sticky", text: "Note" },
      { ...common, id: "arrow", type: "arrow", size: undefined, bend: 0, handles: { start: { id: "start", index: 0, point: [0, 0] }, bend: { id: "bend", index: 1, point: [40, 20] }, end: { id: "end", index: 2, point: [80, 0] } }, decorations: { end: "arrow" } },
    ];
    // JSON is the transport; undefined properties are absent in received objects.
    const shapes = validateWhiteboard(JSON.parse(JSON.stringify(raw)));
    expect(shapes).toHaveLength(5);
    const html = renderToStaticMarkup(createElement(ChangeSummary, { before: exampleGraph(), after: board(shapes) }));
    expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;");
  });

  it("rejects unsafe asset, custom, binding, nested and reserved records instead of silently dropping them", () => {
    for (const bad of [
      { ...rectangle(), id: "axiomer-thought-owned" },
      { ...rectangle(), id: "__proto__" },
      { ...rectangle(), id: "constructor" },
      { ...rectangle(), id: "bad id" },
      { ...rectangle(), type: "image", assetId: "external" },
      { ...rectangle(), type: "group", children: ["x"] },
      { ...rectangle(), parentId: "another-shape" },
      { ...rectangle(), metadata: { url: "javascript:alert(1)" } },
      { ...rectangle(), assetId: "https://example.org/private" },
      { ...rectangle(), point: [NaN, 0] },
      { ...rectangle(), size: [-1, 20] },
      { ...rectangle(), style: { ...rectangle().style, color: "url(javascript:evil)" } },
    ]) expect(() => validateRoadmap({ ...exampleGraph(), whiteboard: [bad] })).toThrow("Invalid whiteboard");
    expect(() => validateWhiteboard([rectangle(), rectangle()])).toThrow("duplicated");
  });

  it("bounds drawing work and canonicalizes record order without losing z-order", () => {
    expect(() => validateWhiteboard(Array.from({ length: 2001 }, (_, i) => rectangle(`r${i}`)))).toThrow("2,000");
    expect(() => validateWhiteboard([{ ...drawing(), points: Array.from({ length: 20001 }, () => [0, 0]) }])).toThrow("20,000");
    const a = rectangle("a"), b = drawing("b");
    expect(whiteboardMeaning([b, a])).toBe(whiteboardMeaning([a, b]));
    const reordered = { ...a, childIndex: 3 };
    expect(whiteboardMeaning([b, reordered])).not.toBe(whiteboardMeaning([a, b]));
  });
});


describe("shared drawing arrangement", () => {
  it("round-trips placement without altering argument connections or reading order", () => {
    const original = exampleGraph();
    const placed = validateRoadmap({ ...original, whiteboardPositions: { v: { x: 420, y: -160 } } });
    expect(importRoadmap(JSON.parse(JSON.stringify(placed)))).toEqual(placed);
    expect(placed.edges).toEqual(original.edges);
    expect(diffRoadmaps(original, placed).whiteboardChanged).toBe(true);
    expect(hasRoadmapChanges(original, placed)).toBe(true);
  });
  it("rejects missing thoughts, unbounded coordinates and hidden arrangement fields", () => {
    for (const positions of [{ missing: { x: 0, y: 0 } }, { v: { x: NaN, y: 0 } }, { v: { x: 0, y: 0, url: 'https://example.org' } }])
      expect(() => validateRoadmap({ ...exampleGraph(), whiteboardPositions: positions })).toThrow(/arrangement/);
  });
  it("requires a single explicit drawing-plus-placement choice on concurrent board edits", () => {
    const base = exampleGraph();
    const proposed = { ...base, whiteboard: [rectangle()], whiteboardPositions: { v: { x: 200, y: 100 } } };
    const latest = { ...base, whiteboardPositions: { v: { x: -200, y: 100 } } };
    expect(rebaseRoadmap(base, proposed, latest).graph).toBeNull();
    const resolved = rebaseRoadmap(base, proposed, latest, { 'whiteboard:drawing': 'proposed' });
    expect(resolved.graph?.whiteboard).toEqual(proposed.whiteboard);
    expect(resolved.graph?.whiteboardPositions).toEqual(proposed.whiteboardPositions);
    const html = renderToStaticMarkup(createElement(ChangeSummary, { before: base, after: proposed }));
    expect(html).toContain('Argument arrangement'); expect(html).toContain('200');
  });
  it("removes only the deleted thought's placement with the explicit semantic deletion", () => {
    const graph = validateRoadmap({ ...exampleGraph(), whiteboardPositions: { v: { x: 1, y: 2 }, b: { x: 3, y: 4 } } });
    const next = removeThought(graph, 'b');
    expect(next.whiteboardPositions).toEqual({ v: { x: 1, y: 2 } });
  });
});
