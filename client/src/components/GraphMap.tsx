import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EdgeType, Graph, GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

interface GraphMapProps {
  graph: Graph;
}

// Compact node sizing — well-labelled pills, not boxes, so the graph scales to
// volume. Full content is shown on hover (title) and in the detail panel.
const NODE_W = 210;
const NODE_H = 40;

// Short, human relationship labels for the connections (Obsidian-style).
const EDGE_LABEL: Record<EdgeType, string> = {
  answers: "answers",
  supports: "supports",
  "argues-for": "argues for",
  "argues-against": "argues against",
  raises: "raises",
  "objects-to": "objects to",
  rebuts: "rebuts",
  "grounds-in": "grounds in",
  "connects-to": "relates to",
  illustrates: "illustrates",
  entails: "entails",
};

// Connection colour by role, so support/attack/foundation read at a glance.
function edgeColor(type: EdgeType): string {
  if (type === "supports" || type === "argues-for") return "#16a34a"; // support
  if (type === "argues-against" || type === "objects-to") return "#dc2626"; // attack
  if (type === "grounds-in") return "#ca8a04"; // foundation
  if (type === "rebuts") return "#0d9488"; // defends
  return "#94a3b8"; // neutral / structural
}

type AxiomerNodeData = {
  node: GraphNode;
  dim: boolean;
  selected: boolean;
};

// A compact, well-labelled pill — icon + one-line label, colour-coded by type.
function AxiomerFlowNode({ data }: NodeProps<Node<AxiomerNodeData>>) {
  const { node, dim, selected } = data;
  const meta = NODE_META[node.type];
  return (
    <div
      title={`${meta.label}: ${node.content}`}
      className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 shadow-sm"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderColor: selected ? meta.color : "#e2e8f0",
        borderLeft: `4px solid ${meta.color}`,
        boxShadow: selected ? `0 0 0 3px ${meta.color}44` : undefined,
        opacity: dim ? 0.3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="shrink-0 text-sm" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      <span className="truncate text-[11px] font-medium text-slate-700">
        {node.content}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { axiomer: AxiomerFlowNode };
const edgeTypes: EdgeTypes = {};

export default function GraphMap({ graph }: GraphMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positions = useMemo(() => layoutGraph(graph, NODE_W, NODE_H), [graph]);

  // Lineage of the selected node (everything flowing into OR out of it).
  const highlighted = useMemo<Set<string> | null>(() => {
    if (!selectedId) return null;
    const set = G.getAncestors(graph, selectedId);
    for (const id of G.getDescendantIds(graph, selectedId)) set.add(id);
    set.add(selectedId);
    return set;
  }, [graph, selectedId]);

  const selectedNode = selectedId ? G.getNode(graph, selectedId) : undefined;

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
        const color = edgeColor(edge.edgeType);
        // Labels only on the focused lineage — keeps the canvas readable at
        // volume, surfaces the relationship when you focus a node.
        const showLabel = Boolean(highlighted) && lit;
        return {
          id: edge.id,
          source: parent,
          target: child,
          type: "smoothstep",
          label: showLabel ? EDGE_LABEL[edge.edgeType] : undefined,
          labelStyle: { fontSize: 9, fill: "#475569" },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          labelBgPadding: [3, 1] as [number, number],
          labelBgBorderRadius: 3,
          style: {
            stroke: lit ? color : "#e2e8f0",
            strokeWidth: lit ? 1.75 : 1,
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
    <div className="relative h-[78vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedId(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={22} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => NODE_META[(n.data as AxiomerNodeData).node.type].color}
          maskColor="rgba(248,250,252,0.7)"
        />
      </ReactFlow>

      {/* Detail panel — full content + context on demand, so nodes stay compact. */}
      {selectedNode && (
        <div className="absolute right-3 top-3 max-h-[calc(78vh-1.5rem)] w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span style={{ color: NODE_META[selectedNode.type].color }}>
              {NODE_META[selectedNode.type].icon}
            </span>
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: NODE_META[selectedNode.type].color }}
            >
              {NODE_META[selectedNode.type].label}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="ml-auto text-slate-400 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-sm text-slate-800">{selectedNode.content}</p>
          <p className="mt-2 text-[11px] text-slate-400">
            Highlighting its full lineage. Click the background to clear.
          </p>
        </div>
      )}
    </div>
  );
}
