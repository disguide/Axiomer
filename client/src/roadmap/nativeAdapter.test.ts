import { describe, expect, it } from "vitest";
import { annotationShapes, nativeProjection, thoughtShapeId } from "./nativeAdapter";
import { validateRoadmap, type Roadmap } from "./model";
import { validateWhiteboard } from "./whiteboard";
import type { TDShape } from "@tldraw/tldraw";

const graph: Roadmap = { schema: 2, anchor: "value", nodes: [
  { id: "value", text: "Reduce avoidable suffering", kind: "value", sources: [{ id: "source", title: "Evidence", url: "https://example.org/reference" }] },
  { id: "claim / 2", text: "Compare consequences", kind: null },
  { id: "branch", text: "Consider rights", kind: null },
], edges: [
  { id: "link1", from: "value", to: "claim / 2", label: "supports", semantic: { from: "claim / 2", to: "value", type: "grounded-by" } },
  { id: "link2", from: "value", to: "branch", label: "alternative" },
] };

describe("native whiteboard projection boundaries", () => {
  it("projects branches and original labels without mutating graph meaning or sources", () => {
    const before = structuredClone(graph);
    const projection = nativeProjection(graph, {}, true, "value");
    expect(projection.shapes).toHaveLength(5);
    expect(projection.thoughtIds.get(thoughtShapeId("claim / 2"))).toBe("claim / 2");
    expect(projection.shapes.filter(shape => shape.type === "arrow").map(shape => shape.label)).toEqual(["supports", "alternative"]);
    expect(graph).toEqual(before);
    expect(validateRoadmap(graph)).toEqual(before);
  });
  it("uses local positions only in overview while retaining a bounded connected focus", () => {
    const manual = { value: { x: 888, y: 777 } };
    const all = nativeProjection(graph, manual, true, "value");
    expect(all.shapes.find(s => s.id === thoughtShapeId("value"))?.point).toEqual([888, 777]);
    const focused = nativeProjection(graph, manual, false, "claim / 2");
    expect(focused.thoughtIds.size).toBe(2);
    expect(focused.edgeIds.size).toBe(1);
    expect(focused.shapes.find(s => s.id === thoughtShapeId("value"))?.point).not.toEqual([888, 777]);
  });
  it("keeps a native drawing arrow separate, strips transient bindings and round-trips safely", () => {
    const arrow = { id: "drawing-arrow", type: "arrow", name: "Drawing arrow", parentId: "page", childIndex: 1, point: [10, 20], style: { color: "black", size: "small", dash: "solid" }, bend: 0,
      handles: { start: { id: "start", index: 0, point: [0, 0], bindingId: "temporary-binding" }, bend: { id: "bend", index: 1, point: [50, 25] }, end: { id: "end", index: 2, point: [100, 50] } } } as unknown as TDShape;
    const projection = nativeProjection(graph, {}, true, "value");
    const annotations = annotationShapes([...projection.shapes, arrow]);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe("drawing-arrow");
    expect(annotations[0].handles?.start.bindingId).toBeUndefined();
    const accepted = validateWhiteboard(annotations);
    const restored = validateRoadmap({ ...graph, whiteboard: accepted });
    expect(restored.whiteboard).toEqual(accepted);
    expect(restored.edges).toEqual(graph.edges);
    expect(arrow.handles?.start.bindingId).toBe("temporary-binding");
  });
});
