// Lay out the argument DAG top-down with dagre, returning a position per node.
// Edges run parent → child (semantic direction normalized via edgeEndpoints),
// so values/child-claims sit below the arguments that lead to them and
// shared values become real convergence points.

import dagre from "dagre";
import type { Graph } from "./types";
import { edgeEndpoints } from "./graph";

export interface NodePosition {
  x: number;
  y: number;
}

export const MAP_NODE_WIDTH = 230;
export const MAP_NODE_HEIGHT = 72;

export function layoutGraph(
  graph: Graph
): Record<string, NodePosition> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 64, nodesep: 28, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    const isRoot = ["claim", "premise"].includes(node.type);
    const isTerminal = ["value", "bedrock", "limit", "preference", "source"].includes(node.type);
    const w = isRoot ? 240 : (isTerminal ? 200 : 220);
    const h = isRoot ? 80 : (isTerminal ? 36 : 48);
    g.setNode(node.id, { width: w, height: h });
  }
  for (const edge of graph.edges) {
    const { parent, child } = edgeEndpoints(edge);
    g.setEdge(parent, child);
  }

  dagre.layout(g);

  const positions: Record<string, NodePosition> = {};
  for (const node of graph.nodes) {
    const laid = g.node(node.id);
    if (laid) {
      const isRoot = ["claim", "premise"].includes(node.type);
      const isTerminal = ["value", "bedrock", "limit", "preference", "source"].includes(node.type);
      const w = isRoot ? 240 : (isTerminal ? 200 : 220);
      const h = isRoot ? 80 : (isTerminal ? 36 : 48);
      // dagre centers nodes; React Flow positions from the top-left corner.
      positions[node.id] = {
        x: laid.x - w / 2,
        y: laid.y - h / 2,
      };
    }
  }
  return positions;
}
