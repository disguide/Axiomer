import type { TDShapeType, TDShape, ShapeStyles } from "@tldraw/tldraw";
import { indexGraph, layoutRoadmap, type Roadmap } from "./model";
import { ownPosition, type Point } from "./layoutStorage";

export const thoughtShapeId = (id: string) => `axiomer-thought-${encodeURIComponent(id)}`;
export const edgeShapeId = (id: string) => `axiomer-link-${encodeURIComponent(id)}`;
const nativeTypes = new Set<string>(["draw", "rectangle", "ellipse", "triangle", "arrow", "text", "sticky"]);
export function annotationShapes(shapes: TDShape[]): TDShape[] {
  return shapes.filter((shape) => !shape.id.startsWith("axiomer-") && nativeTypes.has(shape.type)).map((shape) => {
    const copy = JSON.parse(JSON.stringify(shape)) as TDShape; copy.parentId = "page";
    if (copy.handles) for (const handle of Object.values(copy.handles)) delete handle.bindingId;
    return copy;
  });
}

/** A view projection: native arrows never rewrite original semantic direction. */
export function nativeProjection(graph: Roadmap, manual: Record<string, Point>, overview: boolean, selected: string | null) {
  const index = indexGraph(graph);
  const nearby = new Set(selected ? [selected, ...(index.parents.get(selected) || []), ...(index.children.get(selected) || [])] : []);
  const nodes = graph.nodes.filter((node) => overview || nearby.has(node.id));
  const visible = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to));
  const positions = layoutRoadmap(overview ? graph : { ...graph, anchor: selected, nodes, edges });
  const point = (id: string): Point => overview ? ownPosition(manual, id) || positions.get(id)! : positions.get(id)!;
  const thoughtIds = new Map<string, string>(), edgeIds = new Map<string, string>();
  const shapes: TDShape[] = [];
  const style = { color: "black", size: "small", dash: "solid", font: "sans", isFilled: false } as ShapeStyles;
  edges.forEach((edge, i) => {
    const from = point(edge.from), to = point(edge.to), a = [from.x + 120, from.y + 112], b = [to.x + 120, to.y];
    const origin = [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
    const start = [a[0] - origin[0], a[1] - origin[1]], end = [b[0] - origin[0], b[1] - origin[1]];
    const id = edgeShapeId(edge.id); edgeIds.set(id, edge.id);
    shapes.push({ id, type: "arrow" as TDShapeType.Arrow, name: "Argument connection", parentId: "page", childIndex: i + 1, point: origin, rotation: 0, bend: 0, handles: {
      start: { id: "start", index: 0, point: start }, bend: { id: "bend", index: 1, point: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] }, end: { id: "end", index: 2, point: end },
    }, decorations: { end: "arrow" as import("@tldraw/tldraw").Decoration.Arrow }, label: edge.label, style: { ...style, color: "gray" as import("@tldraw/tldraw").ColorStyle.Gray } });
  });
  nodes.forEach((node, i) => {
    const id = thoughtShapeId(node.id), p = point(node.id); thoughtIds.set(id, node.id);
    shapes.push({ id, type: "rectangle" as TDShapeType.Rectangle, parentId: "page", name: "Argument thought", childIndex: edges.length + i + 1, point: [p.x, p.y], size: [240, 112], rotation: 0, label: node.text, style: { ...style, color: (graph.anchor === node.id ? "green" : "black") as import("@tldraw/tldraw").ColorStyle } });
  });
  return { shapes, thoughtIds, edgeIds };
}
