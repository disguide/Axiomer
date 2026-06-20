// Lay out the argument DAG top-down with dagre, returning a position per node.
// Edges run parent → child (semantic direction normalized via edgeEndpoints),
// so values/child-questions sit below the arguments that lead to them and
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
  graph: Graph,
  nodeWidth = MAP_NODE_WIDTH,
  nodeHeight = MAP_NODE_HEIGHT,
): Record<string, NodePosition> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 64, nodesep: 28, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
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
      // dagre centers nodes; React Flow positions from the top-left corner.
      positions[node.id] = {
        x: laid.x - nodeWidth / 2,
        y: laid.y - nodeHeight / 2,
      };
    }
  }
  return positions;
}
