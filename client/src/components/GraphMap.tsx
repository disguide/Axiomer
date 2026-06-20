import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Graph, GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

interface GraphMapProps {
  graph: Graph;
}

type AxiomerNodeData = {
  node: GraphNode;
  dim: boolean;
  selected: boolean;
};

// A compact card colored by node type, with edge handles top (target) and
// bottom (source) so the DAG flows downward.
function AxiomerFlowNode({ data }: NodeProps<Node<AxiomerNodeData>>) {
  const { node, dim, selected } = data;
  const meta = NODE_META[node.type];
  return (
    <div
      className="rounded-md border bg-white px-2.5 py-2 shadow-sm transition-opacity"
      style={{
        width: 230,
        borderLeft: `5px solid ${meta.color}`,
        borderColor: selected ? meta.color : "#e2e8f0",
        boxShadow: selected ? `0 0 0 2px ${meta.color}55` : undefined,
        opacity: dim ? 0.25 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="flex items-center gap-1.5">
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <span
          className="text-[9px] font-semibold tracking-wide"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-700">
        {node.content}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { axiomer: AxiomerFlowNode };

export default function GraphMap({ graph }: GraphMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positions = useMemo(() => layoutGraph(graph), [graph]);

  // Highlight a node's full lineage (everything that flows into OR out of it).
  const highlighted = useMemo<Set<string> | null>(() => {
    if (!selectedId) return null;
    const set = G.getAncestors(graph, selectedId);
    for (const id of G.getDescendantIds(graph, selectedId)) set.add(id);
    set.add(selectedId);
    return set;
  }, [graph, selectedId]);

  const nodes = useMemo<Node<AxiomerNodeData>[]>(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        type: "axiomer",
        position: positions[node.id] ?? { x: 0, y: 0 },
        data: {
          node,
          dim: highlighted ? !highlighted.has(node.id) : false,
          selected: node.id === selectedId,
        },
      })),
    [graph.nodes, positions, highlighted, selectedId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const { parent, child } = G.edgeEndpoints(edge);
        const lit =
          !highlighted || (highlighted.has(parent) && highlighted.has(child));
        return {
          id: edge.id,
          source: parent,
          target: child,
          style: {
            stroke: lit ? "#94a3b8" : "#e2e8f0",
            strokeWidth: lit ? 1.5 : 1,
          },
        };
      }),
    [graph.edges, highlighted],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) =>
      setSelectedId((cur) => (cur === node.id ? null : node.id)),
    [],
  );

  if (graph.nodes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        Nothing to map yet. Add a question or premise first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        The whole argument graph as a DAG. Shared values are real convergence
        points — click any node to highlight its full lineage; click again or on
        the background to clear.
      </p>
      <div className="h-[70vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              NODE_META[(n.data as AxiomerNodeData).node.type].color
            }
          />
        </ReactFlow>
      </div>
    </div>
  );
}
