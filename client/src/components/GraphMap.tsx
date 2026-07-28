import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
  type Connection,
  type NodeChange,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EdgeType, Graph, GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";
import CanvasToolbar from "./CanvasToolbar";
import { GraphSetupWizard } from "./GraphSetupWizard";
import type { NodeType } from "@/lib/types";

interface GraphMapProps {
  graph: Graph;
  onNodeMove?: (id: string, position: { x: number; y: number }) => void;
  onConnectEdges?: (sourceId: string, targetId: string) => void;
  onAddNode?: (type: NodeType, content: string, position: { x: number; y: number }) => void;
  onEditNode?: (id: string, content: string) => void;
}

const NODE_W = 210;
const NODE_H = 40;

const EDGE_LABEL: Record<EdgeType, string> = {
  supports: "supports",
  attacks: "attacks",
  annotates: "annotates",
  grounds: "grounds in",
  cites: "cites",
};

function edgeColor(type: EdgeType): string {
  if (type === "supports") return "#16a34a"; // green
  if (type === "attacks") return "#dc2626"; // red
  if (type === "grounds") return "#ca8a04"; // yellow
  if (type === "cites") return "#0d9488"; // teal
  return "#94a3b8"; // slate
}

type AxiomerNodeData = {
  node: GraphNode;
  dim: boolean;
  selected: boolean;
  isEditing: boolean;
  onEditSubmit: (content: string) => void;
  onEditCancel: () => void;
};

// Inline Editing Node
function AxiomerFlowNode({ data }: NodeProps<Node<AxiomerNodeData>>) {
  const { node, dim, selected, isEditing, onEditSubmit, onEditCancel } = data;
  const meta = NODE_META[node.type];
  const [val, setVal] = useState(node.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text when editing existing
      if (node.id !== "draft") {
        inputRef.current.select();
      }
    }
  }, [isEditing, node.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      onEditSubmit(val);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onEditCancel();
    }
  };

  return (
    <div
      title={`${meta.label}: ${node.content}`}
      className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 shadow-md shadow-slate-200/50"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderColor: selected ? meta.color : "#e2e8f0",
        borderLeft: `4px solid ${meta.color}`,
        opacity: dim ? 0.3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="shrink-0 text-sm" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      {isEditing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onEditSubmit(val)}
          placeholder={meta.placeholder}
          className="w-full bg-transparent text-[11px] font-medium text-slate-700 outline-none"
        />
      ) : (
        <span className="truncate text-[11px] font-medium text-slate-700">
          {node.content}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { axiomer: AxiomerFlowNode };
const edgeTypes: EdgeTypes = {};

export default function GraphMap(props: GraphMapProps) {
  if (props.graph.nodes.length === 0 && !props.onAddNode) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 bg-slate-50">
        Nothing to map yet. Add a claim or premise first.
      </p>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphMapInner {...props} />
    </ReactFlowProvider>
  );
}

function GraphMapInner({ graph, onNodeMove, onConnectEdges, onAddNode, onEditNode }: GraphMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNode, setDraftNode] = useState<{ type: NodeType; position: { x: number; y: number } } | null>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const positions = useMemo(() => layoutGraph(graph, NODE_W, NODE_H), [graph]);

  const highlighted = useMemo<Set<string> | null>(() => {
    if (!selectedId) return null;
    const set = G.getAncestors(graph, selectedId);
    for (const id of G.getDescendantIds(graph, selectedId)) set.add(id);
    set.add(selectedId);
    return set;
  }, [graph, selectedId]);

  const selectedNode = selectedId ? G.getNode(graph, selectedId) : undefined;

  const nodes = useMemo<Node<AxiomerNodeData>[]>(() => {
    const flowNodes = graph.nodes.map((node) => ({
      id: node.id,
      type: "axiomer",
      position: node.position ?? positions[node.id] ?? { x: 0, y: 0 },
      data: {
        node,
        dim: highlighted ? !highlighted.has(node.id) : false,
        selected: node.id === selectedId,
        isEditing: node.id === editingId,
        onEditSubmit: (content: string) => {
          if (content.trim() && content.trim() !== node.content && onEditNode) {
            onEditNode(node.id, content.trim());
          }
          setEditingId(null);
        },
        onEditCancel: () => setEditingId(null),
      },
    }));

    if (draftNode) {
      flowNodes.push({
        id: "draft",
        type: "axiomer",
        position: draftNode.position,
        data: {
          node: { id: "draft", type: draftNode.type, content: "" },
          dim: false,
          selected: true,
          isEditing: true,
          onEditSubmit: (content: string) => {
            if (content.trim() && onAddNode) {
              onAddNode(draftNode.type, content.trim(), draftNode.position);
            }
            setDraftNode(null);
          },
          onEditCancel: () => setDraftNode(null),
        },
      });
    }
    return flowNodes;
  }, [graph.nodes, positions, highlighted, selectedId, editingId, draftNode, onEditNode, onAddNode]);

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const { parent, child } = G.edgeEndpoints(edge);
        const lit = !highlighted || (highlighted.has(parent) && highlighted.has(child));
        const color = edgeColor(edge.edgeType);
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
    (_: unknown, node: Node) => {
      if (node.id === "draft") return;
      setSelectedId((cur) => (cur === node.id ? null : node.id));
    },
    [],
  );

  const handleAddNode = useCallback((type: NodeType) => {
    if (!onAddNode) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    setDraftNode({ type, position: center });
  }, [onAddNode, screenToFlowPosition]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!onNodeMove) return;
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.id !== 'draft') {
        onNodeMove(change.id, change.position);
      }
    }
  }, [onNodeMove]);

  const onConnect = useCallback((connection: Connection) => {
    if (!onConnectEdges || !connection.source || !connection.target) return;
    onConnectEdges(connection.source, connection.target);
  }, [onConnectEdges]);

  const onNodeDoubleClick = useCallback((_: unknown, node: Node<AxiomerNodeData>) => {
    if (!onEditNode || node.id === "draft") return;
    setEditingId(node.id);
  }, [onEditNode]);

  return (
    <div className="relative h-[78vh] overflow-hidden rounded-xl border border-slate-200/60 bg-transparent backdrop-blur-[2px] shadow-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => {
          setSelectedId(null);
          setEditingId(null);
          setDraftNode(null);
        }}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        nodesDraggable={!!onNodeMove}
        nodesConnectable={!!onConnectEdges}
        elementsSelectable
        fitView={!onNodeMove}
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

      {graph.nodes.length === 0 && onAddNode ? (
        <GraphSetupWizard 
          onComplete={(premises, values) => {
            let x = window.innerWidth / 2 - 250;
            let y = 150;
            
            premises.forEach((p, i) => {
              onAddNode("premise", p, { x: x, y: y + i * 80 });
            });
            
            x = window.innerWidth / 2 + 100;
            values.forEach((v, i) => {
              onAddNode("value", v, { x: x, y: y + i * 80 });
            });
          }}
        />
      ) : (
        <CanvasToolbar
          onAddNode={handleAddNode}
          disabled={!onAddNode}
          onZoomIn={() => zoomIn({ duration: 300 })}
          onZoomOut={() => zoomOut({ duration: 300 })}
          onFitView={() => fitView({ duration: 300, padding: 0.2 })}
        />
      )}

      {selectedNode && (
        <div className="absolute right-3 top-3 max-h-[calc(78vh-1.5rem)] w-72 overflow-auto rounded-lg border border-slate-200 bg-white/80 backdrop-blur-md p-3 shadow-lg">
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
