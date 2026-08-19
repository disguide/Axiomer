import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronRight, Link2, Plus, Search, Trash2, X } from "lucide-react";
import type { EdgeType, Graph, GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

interface GraphMapProps {
  graph: Graph;
  onCreateRoot?: (content: string) => void;
  onAddNode?: (type: NodeType, content: string, parentId: string) => void;
  onEditNode?: (id: string, content: string) => void;
  onDeleteNode?: (id: string) => void;
  onLinkValue?: (parentId: string, terminalId: string) => void;
}

const EDGE_LABEL: Record<EdgeType, string> = {
  supports: "supports",
  conflicts: "challenges",
  annotates: "adds context",
  grounds: "grounds in",
  cites: "cites",
};

const EDGE_COLOR: Record<EdgeType, string> = {
  supports: "#059669",
  conflicts: "#e11d48",
  annotates: "#94a3b8",
  grounds: "#b45309",
  cites: "#0d9488",
};

const ACTION_LABEL: Partial<Record<NodeType, string>> = {
  claim: "Deeper claim",
  support: "Support",
  conflict: "Conflict",
  note: "Context",
  value: "Value",
  source: "Source",
  limit: "Limit",
  bedrock: "Bedrock",
  preference: "Preference",
};

type FlowData = {
  node: GraphNode;
  selected: boolean;
  dimmed: boolean;
  grounded: boolean;
};

function FlowNode({ data }: NodeProps<Node<FlowData>>) {
  const { node, selected, dimmed, grounded } = data;
  const meta = NODE_META[node.type];
  const terminal = isTerminalType(node.type);
  const root = node.type === "claim" || node.type === "premise";

  return (
    <div
      className={`relative border bg-white text-left transition-[opacity,box-shadow,border-color] duration-200 ${
        terminal ? "rounded-full px-3.5 py-2" : root ? "rounded-2xl px-4 py-3.5" : "rounded-xl px-3.5 py-2.5"
      } ${selected ? "shadow-xl ring-2 ring-slate-900/10" : "shadow-sm"}`}
      style={{
        width: terminal ? 210 : root ? 250 : 225,
        borderColor: selected ? meta.color : terminal ? `${meta.color}45` : "#e2e8f0",
        borderLeftWidth: terminal || root ? undefined : 3,
        borderLeftColor: meta.color,
        opacity: dimmed ? 0.18 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="flex items-center gap-2">
        <span className="shrink-0" style={{ color: meta.color }}>{meta.icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</span>
        {!terminal && node.type !== "note" && (
          <span className={`ml-auto h-1.5 w-1.5 rounded-full ${grounded ? "bg-emerald-500" : "bg-amber-400"}`} title={grounded ? "Grounded" : "Open"} />
        )}
      </div>
      <p className={`${root ? "mt-2 text-sm font-semibold" : terminal ? "ml-6 -mt-4 text-xs font-medium" : "mt-1.5 text-xs font-medium"} line-clamp-3 leading-snug text-slate-800`}>
        {node.content}
      </p>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { axiomer: FlowNode };

export default function GraphMap(props: GraphMapProps) {
  return (
    <ReactFlowProvider>
      <GraphMapInner {...props} />
    </ReactFlowProvider>
  );
}

function EmptyMap({ onCreate }: { onCreate: (content: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(circle_at_center,#fff_0%,#f7f7f4_70%)] p-5">
      <form className="w-full max-w-xl text-center" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onCreate(draft.trim()); }}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg"><Plus className="h-5 w-5" /></span>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Start with one clear thought.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Write a question, decision, or belief. You can trace the reasons beneath it next.</p>
        <div className="mt-7 flex rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Should I change careers?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-slate-400" />
          <button disabled={!draft.trim()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">Begin</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">No setup, template, or special notation required.</p>
      </form>
    </div>
  );
}

function GraphMapInner({ graph, onCreateRoot, onAddNode, onEditNode, onDeleteNode, onLinkValue }: GraphMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addingType, setAddingType] = useState<NodeType | null>(null);
  const [addDraft, setAddDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [showFoundations, setShowFoundations] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rootComposer, setRootComposer] = useState(false);
  const [rootDraft, setRootDraft] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { setCenter, fitView } = useReactFlow();
  const positions = useMemo(() => layoutGraph(graph), [graph]);
  const acceptability = useMemo(() => G.getAcceptability(graph), [graph]);
  const selectedNode = selectedId ? G.getNode(graph, selectedId) : undefined;

  useEffect(() => {
    if (!selectedNode) return;
    setEditDraft(selectedNode.content);
    setEditing(false);
    setAddingType(null);
    setShowFoundations(false);
    setConfirmDelete(false);
  }, [selectedNode?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const highlighted = useMemo<Set<string> | null>(() => {
    if (!selectedId) return null;
    const ids = G.getAncestors(graph, selectedId);
    for (const id of G.getDescendantIds(graph, selectedId)) ids.add(id);
    ids.add(selectedId);
    return ids;
  }, [graph, selectedId]);

  const nodes = useMemo<Node<FlowData>[]>(() => graph.nodes.map((node) => ({
    id: node.id,
    type: "axiomer",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: {
      node,
      selected: node.id === selectedId,
      dimmed: Boolean(highlighted && !highlighted.has(node.id)),
      grounded: G.isNodeGrounded(graph, node.id),
    },
  })), [graph, positions, selectedId, highlighted]);

  const edges = useMemo<Edge[]>(() => graph.edges.map((edge) => {
    const { parent, child } = G.edgeEndpoints(edge);
    const active = !highlighted || (highlighted.has(parent) && highlighted.has(child));
    return {
      id: edge.id,
      source: parent,
      target: child,
      type: "smoothstep",
      label: highlighted && active ? EDGE_LABEL[edge.edgeType] : undefined,
      labelStyle: { fontSize: 9, fill: "#64748b", fontWeight: 600 },
      labelBgStyle: { fill: "#f7f7f4", fillOpacity: 0.96 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 5,
      animated: edge.edgeType === "conflicts" && active,
      style: {
        stroke: active ? EDGE_COLOR[edge.edgeType] : "#cbd5e1",
        strokeWidth: active ? 1.8 : 1,
        opacity: active ? 0.8 : 0.2,
        strokeDasharray: edge.edgeType === "conflicts" ? "5 5" : undefined,
      },
    };
  }), [graph.edges, highlighted]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return graph.nodes.filter((node) => node.content.toLowerCase().includes(normalized)).slice(0, 6);
  }, [graph.nodes, query]);

  const focusNode = useCallback((node: GraphNode) => {
    setSelectedId(node.id);
    setQuery("");
    const position = positions[node.id];
    if (position) setCenter(position.x + 115, position.y + 35, { zoom: 1.05, duration: 450 });
  }, [positions, setCenter]);

  const submitAdd = () => {
    if (!selectedNode || !addingType || !addDraft.trim() || !onAddNode) return;
    onAddNode(addingType, addDraft.trim(), selectedNode.id);
    setAddDraft("");
    setAddingType(null);
  };

  const availableActions = selectedNode
    ? ALLOWED_CHILDREN[selectedNode.type].filter((type) => ACTION_LABEL[type])
    : [];
  const terminalChoices = G.getTerminals(graph).filter((node) => node.id !== selectedId);
  const nodeAcceptability = selectedId ? acceptability.get(selectedId) : undefined;
  const nodeGrounded = selectedId ? G.isNodeGrounded(graph, selectedId) : true;
  const status = nodeAcceptability === "conflicted"
    ? { label: "Conflicted", className: "bg-rose-50 text-rose-700 ring-rose-200" }
    : nodeGrounded
      ? { label: "Grounded", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Open", className: "bg-amber-50 text-amber-700 ring-amber-200" };

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-[var(--canvas)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedId((current) => current === node.id ? null : node.id)}
        onPaneClick={() => setSelectedId(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        minZoom={0.12}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#d7dce2" gap={24} size={1} />
        <Controls showInteractive={false} className="!bottom-4 !left-4 !rounded-xl !border-slate-200 !shadow-sm" />
        <MiniMap pannable zoomable className="!bottom-4 !right-4 !hidden !rounded-xl !border !border-slate-200 !bg-white sm:!block" nodeColor={(node) => NODE_META[(node.data as FlowData).node.type].color} maskColor="rgba(247,247,244,.78)" />
      </ReactFlow>

      {graph.nodes.length === 0 && onCreateRoot && <EmptyMap onCreate={onCreateRoot} />}

      {graph.nodes.length > 0 && (
        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-start gap-2 sm:left-4 sm:top-4">
          <div className="relative w-56 max-w-[calc(100vw-7rem)]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a thought…" className="w-full rounded-xl border border-slate-200 bg-white/95 py-2 pl-9 pr-9 text-sm shadow-sm outline-none backdrop-blur focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60" />
            {query && <button onClick={() => setQuery("")} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>}
            {query && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {matches.length ? matches.map((node) => (
                  <button key={node.id} onClick={() => focusNode(node)} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50">
                    <span style={{ color: NODE_META[node.type].color }}>{NODE_META[node.type].icon}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{node.content}</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                  </button>
                )) : <p className="px-3 py-3 text-xs text-slate-400">No matching thoughts</p>}
              </div>
            )}
          </div>
          {onCreateRoot && (
            <button onClick={() => setRootComposer(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" title="Add a root claim">
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => fitView({ duration: 400, padding: 0.2, maxZoom: 1.1 })} className="hidden h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 shadow-sm hover:bg-slate-50 sm:block">Fit map</button>
        </div>
      )}

      {rootComposer && onCreateRoot && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/20 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setRootComposer(false)}>
          <form className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl" onSubmit={(event) => { event.preventDefault(); if (!rootDraft.trim()) return; onCreateRoot(rootDraft.trim()); setRootDraft(""); setRootComposer(false); }}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Add another starting thought</h2><button type="button" onClick={() => setRootComposer(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <p className="mt-1 text-sm text-slate-500">A separate question, decision, or belief for this map.</p>
            <textarea autoFocus value={rootDraft} onChange={(event) => setRootDraft(event.target.value)} placeholder="What else do you want to explore?" className="mt-4 min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" />
            <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setRootComposer(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button disabled={!rootDraft.trim()} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-30">Add thought</button></div>
          </form>
        </div>
      )}

      {selectedNode && (
        <aside className="absolute right-3 top-3 z-20 max-h-[calc(100%-1.5rem)] w-[350px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl shadow-slate-300/30 backdrop-blur-xl max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:max-h-[54%] max-sm:w-auto">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${NODE_META[selectedNode.type].color}12`, color: NODE_META[selectedNode.type].color }}>{NODE_META[selectedNode.type].icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: NODE_META[selectedNode.type].color }}>{NODE_META[selectedNode.type].label}</span>
                {!isTerminalType(selectedNode.type) && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${status.className}`}>{status.label}</span>}
              </div>
              <p className="mt-1 text-xs text-slate-400">{G.getChildren(graph, selectedNode.id).length} direct connections</p>
            </div>
            <button onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close details"><X className="h-4 w-4" /></button>
          </div>

          {editing ? (
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); if (editDraft.trim() && onEditNode) onEditNode(selectedNode.id, editDraft.trim()); setEditing(false); }}>
              <textarea autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" />
              <div className="mt-2 flex gap-2"><button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Save</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button></div>
            </form>
          ) : (
            <button onDoubleClick={() => onEditNode && setEditing(true)} onClick={() => onEditNode && setEditing(true)} className="mt-5 w-full text-left text-base font-medium leading-7 text-slate-900">{selectedNode.content}</button>
          )}

          {!isTerminalType(selectedNode.type) && onAddNode && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold text-slate-500">Continue this thought</p>
              {!addingType ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {availableActions.map((type) => (
                    <button key={type} onClick={() => { setAddingType(type); setAddDraft(""); }} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50">
                      <span style={{ color: NODE_META[type].color }}>{NODE_META[type].icon}</span>{ACTION_LABEL[type]}
                    </button>
                  ))}
                </div>
              ) : (
                <form className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); submitAdd(); }}>
                  <div className="flex items-center gap-2 text-xs font-bold" style={{ color: NODE_META[addingType].color }}>{NODE_META[addingType].icon}{NODE_META[addingType].prompt}</div>
                  <textarea autoFocus value={addDraft} onChange={(event) => setAddDraft(event.target.value)} placeholder={NODE_META[addingType].placeholder} className="mt-2 min-h-20 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-slate-400" />
                  <div className="mt-2 flex gap-2"><button disabled={!addDraft.trim()} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-30">Add</button><button type="button" onClick={() => setAddingType(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">Cancel</button></div>
                </form>
              )}

              {onLinkValue && terminalChoices.length > 0 && (
                <div className="mt-3">
                  <button onClick={() => setShowFoundations((value) => !value)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800"><Link2 className="h-3.5 w-3.5" /> Use an existing foundation</button>
                  {showFoundations && <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-1">{terminalChoices.map((node) => <button key={node.id} onClick={() => { onLinkValue(selectedNode.id, node.id); setShowFoundations(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"><span style={{ color: NODE_META[node.type].color }}>{NODE_META[node.type].icon}</span><span className="truncate">{node.content}</span></button>)}</div>}
                </div>
              )}
            </div>
          )}

          {(onEditNode || onDeleteNode) && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              {onEditNode && <button onClick={() => setEditing(true)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Edit text</button>}
              {onDeleteNode && <button onClick={() => { if (confirmDelete) { onDeleteNode(selectedNode.id); setSelectedId(null); } else setConfirmDelete(true); }} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold ${confirmDelete ? "bg-rose-50 text-rose-700" : "text-slate-400 hover:bg-rose-50 hover:text-rose-700"}`}><Trash2 className="h-3.5 w-3.5" />{confirmDelete ? `Delete ${G.countDescendants(graph, selectedNode.id) + 1} nodes?` : "Delete"}</button>}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
