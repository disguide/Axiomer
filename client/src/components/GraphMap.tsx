import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
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
  onAddNode?: (type: NodeType, content: string, parentOrPos: string | {x: number, y: number}) => void;
  onEditNode?: (id: string, content: string) => void;
  readOnly?: boolean;
}



const EDGE_LABEL: Record<EdgeType, string> = {
  supports: "supports",
  conflicts: "conflicts",
  annotates: "annotates",
  grounds: "grounds in",
  cites: "cites",
};

function edgeColor(type: EdgeType): string {
  if (type === "supports") return "#16a34a"; // green
  if (type === "conflicts") return "#e11d48"; // rose-600
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
  onSpawnChild?: (type: NodeType) => void;
  readOnly?: boolean;
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
      if (node.id !== "draft") {
        inputRef.current.select();
      }
    }
  }, [isEditing, node.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Allow shift+enter for multiline roots
      if (["claim", "premise"].includes(node.type) && e.shiftKey) return;
      e.stopPropagation();
      e.preventDefault();
      onEditSubmit(val);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onEditCancel();
    }
  };

  const isTerminal = ["value", "bedrock", "limit", "preference", "source"].includes(node.type);
  const isRoot = ["claim", "premise"].includes(node.type);

  if (isRoot) {
    return (
      <div
        title={`${meta.label}: ${node.content}`}
        className={`flex flex-col rounded-2xl border bg-white/70 backdrop-blur-xl px-4 py-3.5 shadow-xl transition-all duration-300 ${selected ? 'ring-2 ring-offset-2' : 'hover:shadow-2xl hover:-translate-y-0.5'}`}
        style={{
          width: 260,
          borderColor: selected ? meta.color : "rgba(255,255,255,0.9)",
          boxShadow: selected ? `0 20px 25px -5px ${meta.color}20, 0 8px 10px -6px ${meta.color}20` : '0 10px 40px -10px rgba(0,0,0,0.08)',
          opacity: dim ? 0.3 : 1,
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{meta.label}</span>
        </div>
        {isEditing ? (
          <textarea
            ref={inputRef as any}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onEditSubmit(val)}
            placeholder={meta.placeholder}
            className="w-full resize-none bg-transparent text-sm font-medium text-slate-800 outline-none min-h-[40px]"
          />
        ) : (
          <span className="text-sm font-medium text-slate-800 leading-snug break-words">
            {node.content}
          </span>
        )}
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  }

  if (isTerminal) {
    return (
      <div
        title={`${meta.label}: ${node.content}`}
        className={`flex items-center gap-2.5 rounded-full border px-4 py-2 shadow-sm transition-all duration-300 backdrop-blur-md ${selected ? 'ring-2 ring-offset-1' : 'hover:shadow-md hover:-translate-y-0.5'}`}
        style={{
          width: 220,
          backgroundColor: `${meta.color}0F`,
          borderColor: selected ? meta.color : `${meta.color}30`,
          boxShadow: selected ? `0 4px 12px ${meta.color}15` : undefined,
          opacity: dim ? 0.3 : 1,
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <span className="shrink-0 text-sm" style={{ color: meta.color }}>
          {meta.icon}
        </span>
        {isEditing ? (
          <textarea
            ref={inputRef as any}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onEditSubmit(val)}
            placeholder={meta.placeholder}
            className="w-full resize-none bg-transparent text-xs font-medium outline-none min-h-[30px]"
            style={{ color: meta.color }}
          />
        ) : (
          <span className="text-xs font-medium leading-snug break-words" style={{ color: meta.color }}>
            {node.content}
          </span>
        )}
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  }

  // Intermediate node (support, conflict, note)
  return (
    <div
      title={`${meta.label}: ${node.content}`}
      className={`flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-lg px-3 py-2.5 shadow-md transition-all duration-300 ${selected ? 'ring-2 ring-offset-1' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
      style={{
        width: 240,
        borderColor: selected ? meta.color : "rgba(255,255,255,0.9)",
        boxShadow: selected ? `0 10px 15px -3px ${meta.color}20` : '0 4px 20px -5px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${meta.color}`,
        opacity: dim ? 0.4 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="shrink-0 text-sm" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      {isEditing ? (
        <textarea
          ref={inputRef as any}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onEditSubmit(val)}
          placeholder={meta.placeholder}
          className="w-full resize-none bg-transparent text-[11px] font-medium text-slate-700 outline-none min-h-[30px]"
        />
      ) : (
        <span className="line-clamp-2 text-[11px] font-medium text-slate-700 leading-tight">
          {node.content}
        </span>
      )}
      
      {/* Quick Spawn Handles */}
        {!isEditing && selected && !data.readOnly && (
           <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 animate-in fade-in zoom-in slide-in-from-top-2 duration-200">
              <button 
                 title="Add Support"
                 onClick={(e) => { e.stopPropagation(); data.onSpawnChild?.("supports" as NodeType); }}
                 className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                 title="Add Conflict"
                 onClick={(e) => { e.stopPropagation(); data.onSpawnChild?.("conflicts" as NodeType); }}
                 className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
           </div>
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

function GraphMapInner({ graph, onNodeMove, onConnectEdges, onAddNode, onEditNode, readOnly }: GraphMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNode, setDraftNode] = useState<{ type: NodeType; parentId: string } | null>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const positions = useMemo(() => layoutGraph(graph), [graph]);

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
        readOnly: readOnly,
        onEditSubmit: (content: string) => {
          if (content.trim() && content.trim() !== node.content && onEditNode) {
            onEditNode(node.id, content.trim());
          }
          setEditingId(null);
        },
        onEditCancel: () => setEditingId(null),
        onSpawnChild: (type: NodeType) => {
          setDraftNode({ type, parentId: node.id });
        },
      },
    }));

    if (draftNode) {
      const parentFlow = flowNodes.find(n => n.id === draftNode.parentId);
      const parentPos = parentFlow ? parentFlow.position : { x: 0, y: 0 };
      
      flowNodes.push({
        id: "draft",
        type: "axiomer",
        position: { x: parentPos.x, y: parentPos.y + 120 },
        data: {
          node: { id: "draft", type: draftNode.type, content: "" },
          dim: false,
          selected: true,
          isEditing: true,
          readOnly: readOnly,
          onEditSubmit: (content: string) => {
            if (content.trim() && onAddNode) {
              onAddNode(draftNode.type, content.trim(), draftNode.parentId);
            }
            setDraftNode(null);
          },
          onEditCancel: () => setDraftNode(null),
          onSpawnChild: (_type: NodeType) => {},
        },
      });
    }
    return flowNodes;
  }, [graph.nodes, positions, highlighted, selectedId, editingId, draftNode, onEditNode, onAddNode, readOnly]);

  const edges = useMemo<Edge[]>(
    () => {
      const existing = graph.edges.map((edge) => {
        const { parent, child } = G.edgeEndpoints(edge);
        const lit = !highlighted || (highlighted.has(parent) && highlighted.has(child));
        const color = edgeColor(edge.edgeType);
        const showLabel = Boolean(highlighted) && lit;
        return {
          id: edge.id,
          source: parent,
          target: child,
          type: "bezier",
          label: showLabel ? EDGE_LABEL[edge.edgeType] : undefined,
          labelStyle: { fontSize: 9, fill: "#475569" },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          labelBgPadding: [3, 1] as [number, number],
          labelBgBorderRadius: 3,
          animated: edge.edgeType === "conflicts",
          style: {
            stroke: lit ? color : "#cbd5e1",
            strokeWidth: lit ? 2 : 1,
            strokeDasharray: edge.edgeType === "conflicts" ? "5 5" : undefined,
          },
        };
      });

      if (draftNode) {
        existing.push({
          id: "draft-edge",
          source: draftNode.parentId,
          target: "draft",
          type: "bezier",
          animated: draftNode.type === "conflict",
          style: {
            stroke: edgeColor(draftNode.type as EdgeType),
            strokeWidth: 2,
            strokeDasharray: draftNode.type === "conflict" ? "5 5" : undefined,
          },
        } as any);
      }
      return existing;
    },
    [graph.edges, highlighted, draftNode]
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.id === "draft") return;
      setSelectedId((cur) => (cur === node.id ? null : node.id));
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    if (!draftNode) setEditingId(null);
    setDraftNode(null);
  }, [draftNode]);

  const handleAddNode = useCallback((type: NodeType) => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    if (onAddNode) {
      onAddNode(type, "", center);
    }
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
        onPaneClick={onPaneClick}
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
        <Background variant={BackgroundVariant.Cross} color="#cbd5e1" gap={24} size={1} />
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
