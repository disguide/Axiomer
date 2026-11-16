import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
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
import { indexGraph, indexedNodeStates, relatedIds, selectVisibleGraph } from "@/lib/navigation";
import "./map-navigation.css";

interface GraphMapProps {
  graph: Graph;
  onCreateRoot?: (content: string) => void;
  onAddNode?: (type: NodeType, content: string, parentId: string) => void;
  onEditNode?: (id: string, content: string) => void;
  onDeleteNode?: (id: string) => void;
  onLinkValue?: (parentId: string, terminalId: string) => void;
  onBuildArgument?: () => void;
  onAttachTree?: (parentId: string) => void;
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
      <p className={`${root ? "mt-2 text-sm font-semibold" : terminal ? "mt-1.5 text-xs font-medium" : "mt-1.5 text-xs font-medium"} line-clamp-3 leading-snug text-slate-800`}>
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

function EmptyMap({ onCreate, onGuided }: { onCreate: (content: string) => void; onGuided?: () => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(circle_at_center,#fff_0%,#f7f7f4_70%)] p-5">
      <form className="w-full max-w-xl text-center" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onCreate(draft.trim()); }}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg"><Plus className="h-5 w-5" /></span>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Start with one clear thought.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Write a question, decision, or belief. You can trace the reasons beneath it next.</p>
        {onGuided && <HStack hAlign="center" paddingBlock={4}><Button label="Build an argument" variant="primary" size="lg" onClick={onGuided} /></HStack>}
        <div className="mt-7 flex rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Should I change careers?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-slate-400" />
          <button disabled={!draft.trim()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">Begin</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">Or begin freely with one thought. No special notation required.</p>
      </form>
    </div>
  );
}

function GraphMapInner({ graph, onCreateRoot, onAddNode, onEditNode, onDeleteNode, onLinkValue, onBuildArgument, onAttachTree }: GraphMapProps) {
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
  const [focusId, setFocusId] = useState<string | null | undefined>(undefined);
  const [depth, setDepth] = useState(3);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [pendingCenter, setPendingCenter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { setCenter, fitView } = useReactFlow();
  const index = useMemo(() => indexGraph(graph), [graph]);
  const effectiveFocusId = focusId === undefined
    ? graph.nodes.length > 200 ? index.roots[0]?.id || graph.nodes[0]?.id : null
    : focusId && index.nodes.has(focusId) ? focusId : null;
  const scope = useMemo(() => selectVisibleGraph(graph, index, {
    focusId: effectiveFocusId,
    depth: effectiveFocusId ? depth : Infinity,
    maxNodes: 200,
  }), [graph, index, effectiveFocusId, depth]);
  const displayedGraph = scope.graph;
  // Content edits do not change the fixed-size layout skeleton.
  const layoutKey = JSON.stringify([displayedGraph.nodes.map(node => [node.id, node.type]), displayedGraph.edges.map(edge => [edge.id, edge.from, edge.to, edge.edgeType])]);
  const positions = useMemo(() => layoutGraph(displayedGraph), [layoutKey]);
  const states = useMemo(() => indexedNodeStates(index), [index]);
  const acceptability = states.acceptability;
  const selectedNode = selectedId ? index.nodes.get(selectedId) : undefined;
  const focus = effectiveFocusId ? index.nodes.get(effectiveFocusId) : undefined;
  const topics = useMemo(() => index.roots.filter(node => node.content.toLowerCase().includes(topicQuery.trim().toLowerCase())), [index, topicQuery]);

  useEffect(() => {
    if (!pendingCenter) return;
    const position = positions[pendingCenter];
    if (!position) return;
    const handle = requestAnimationFrame(() => {
      setCenter(position.x + 115, position.y + 35, { zoom: 1.05, duration: 300 });
      setPendingCenter(null);
    });
    return () => cancelAnimationFrame(handle);
  }, [pendingCenter, positions, setCenter]);

  const showBranch = (id: string | null) => {
    setFocusId(id);
    setSelectedId(null);
    setPendingCenter(id);
    setTopicsOpen(false);
    setDepth(3);
  };
  useEffect(() => {
    if (pendingCenter) return;
    let inner = 0;
    const handle = requestAnimationFrame(() => { inner = requestAnimationFrame(() => fitView({ duration: 200, padding: 0.2, maxZoom: 1.1 })); });
    return () => { cancelAnimationFrame(handle); cancelAnimationFrame(inner); };
  }, [effectiveFocusId, depth, layoutKey, fitView]);
  const startArgument = onBuildArgument || (() => setRootComposer(true));
  useEffect(() => {
    if (selectedId && !index.nodes.has(selectedId)) setSelectedId(null);
  }, [index, selectedId]);

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
    const ids = relatedIds(index, selectedId, "parents");
    for (const id of relatedIds(index, selectedId, "children")) ids.add(id);
    ids.add(selectedId);
    return ids;
  }, [index, selectedId]);

  const nodes = useMemo<Node<FlowData>[]>(() => displayedGraph.nodes.map((node) => ({
    id: node.id,
    type: "axiomer",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: {
      node,
      selected: node.id === selectedId,
      dimmed: Boolean(highlighted && !highlighted.has(node.id)),
      grounded: states.grounded.get(node.id) || false,
    },
  })), [displayedGraph, positions, selectedId, highlighted, states]);

  const edges = useMemo<Edge[]>(() => displayedGraph.edges.map((edge) => {
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
  }), [displayedGraph.edges, highlighted]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return graph.nodes.filter((node) => node.content.toLowerCase().includes(normalized)).slice(0, 6);
  }, [graph.nodes, query]);

  const focusNode = useCallback((node: GraphNode) => {
    setSelectedId(node.id);
    setQuery("");
    setFocusId(node.id);
    setDepth(3);
    setPendingCenter(node.id);
  }, []);

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
  const nodeGrounded = selectedId ? states.grounded.get(selectedId) : true;
  const status = nodeAcceptability === "conflicted"
    ? { label: "Conflicted", className: "bg-rose-50 text-rose-700 ring-rose-200" }
    : nodeGrounded
      ? { label: "Grounded", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Open", className: "bg-amber-50 text-amber-700 ring-amber-200" };

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[var(--canvas)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedId((current) => current === node.id ? null : node.id)}
        onPaneClick={() => setSelectedId(null)}
        onlyRenderVisibleElements
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        minZoom={0.12}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#d7dce2" gap={24} size={1} />
        <Controls showInteractive={false} className="!bottom-24 sm:!bottom-4 !left-4 !rounded-xl !border-slate-200 !shadow-sm" />
        <MiniMap pannable zoomable className="!bottom-4 !right-4 !hidden !rounded-xl !border !border-slate-200 !bg-white sm:!block" nodeColor={(node) => NODE_META[(node.data as FlowData).node.type].color} maskColor="rgba(247,247,244,.78)" />
      </ReactFlow>

      {graph.nodes.length === 0 && onCreateRoot && <EmptyMap onCreate={onCreateRoot} onGuided={onBuildArgument} />}

      {graph.nodes.length > 0 && (
        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-start gap-2 sm:left-4 sm:top-4">
          <div className="relative w-56 max-w-[calc(100vw-7rem)]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input aria-label="Find a thought" ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a thought…" className="w-full rounded-xl border border-slate-200 bg-white/95 py-2 pl-9 pr-9 text-sm shadow-sm outline-none backdrop-blur focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60" />
            {query && <button aria-label="Clear thought search" onClick={() => setQuery("")} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>}
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
            <button onClick={startArgument} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" aria-label={onBuildArgument ? "Build an argument" : "Add a starting thought"} title={onBuildArgument ? "Build an argument" : "Add a starting thought"}>
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => fitView({ duration: 400, padding: 0.2, maxZoom: 1.1 })} className="hidden h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 shadow-sm hover:bg-slate-50 sm:block">Fit map</button>
        </div>
      )}

      {graph.nodes.length > 0 && <VStack className="map-navigation" gap={2} padding={2} aria-label="Map scope">
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button label={focus ? "Change topic" : "Topics"} size="sm" icon={<Icon icon="chevronDown" />} aria-haspopup="dialog" aria-expanded={topicsOpen} onClick={() => setTopicsOpen(true)} />
          {focus && <Button label="All topics" size="sm" variant="ghost" onClick={() => showBranch(null)} />}
          {focus && <Text type="supporting" maxLines={1}>{focus.content}</Text>}
        </HStack>
        {(focus || scope.truncated) && <HStack gap={1} wrap="wrap" aria-label="Visible tree depth">
          {([{ value: 1, label: "2 levels" }, { value: 3, label: "4 levels" }, { value: Infinity, label: "All levels" }]).map(option => <Button key={option.label} label={option.label} size="sm" variant={depth === option.value ? "secondary" : "ghost"} aria-pressed={depth === option.value} onClick={() => { setDepth(option.value); if (!effectiveFocusId) setFocusId(index.roots[0]?.id || graph.nodes[0]?.id); }} />)}
        </HStack>}
        <Text type="supporting" color="secondary">Showing {displayedGraph.nodes.length} of {graph.nodes.length} thoughts{scope.truncated ? " · Search or focus a branch for more" : ""}</Text>
        {focus && Boolean(index.parents.get(focus.id)?.length) && <HStack gap={1} wrap="wrap">
          {(index.parents.get(focus.id) || []).slice(0, 3).map(id => <Button key={id} label={`Up: ${index.nodes.get(id)?.content || "Parent thought"}`} size="sm" variant="ghost" onClick={() => showBranch(id)} />)}
        </HStack>}
      </VStack>}

      <BottomSheet isOpen={topicsOpen} onOpenChange={setTopicsOpen} label="Choose a topic" height="tall">
        <VStack gap={3} padding={3}>
          <Heading level={2}>Choose a topic</Heading>
          <Text color="secondary">Work on one tree at a time. Search the map above to jump to any thought.</Text>
          <TextInput label="Find a topic" value={topicQuery} onChange={setTopicQuery} type="search" />
          <Button label="All topics" onClick={() => showBranch(null)} />
          {topics.slice(0, 100).map(node => <Button key={node.id} label={node.content} width="100%" onClick={() => showBranch(node.id)} />)}
          {topics.length > 100 && <Text type="supporting">Showing the first 100 topics. Refine your topic search.</Text>}
          {topics.length === 0 && <Text type="supporting">No topics match. Search the full map for a specific thought.</Text>}
          <Button label="Close topics" variant="ghost" onClick={() => setTopicsOpen(false)} />
        </VStack>
      </BottomSheet>

      {!selectedNode && !rootComposer && (
        <HStack as="nav" aria-label="Map actions" gap={2} padding={2} hAlign="between" vAlign="center" className="map-thumb-dock sm:!hidden">
          <Button label="Find" size="lg" variant="ghost" icon={<Icon icon={Search} />} onClick={() => searchRef.current?.focus()} />
          {onCreateRoot && <Button label={onBuildArgument ? "Build argument" : "Add thought"} size="lg" variant="primary" icon={<Icon icon={Plus} />} onClick={startArgument} />}
          <Button label="Fit map" size="lg" variant="ghost" onClick={() => fitView({ duration: 400, padding: 0.2, maxZoom: 1.1 })} />
        </HStack>
      )}

      {onCreateRoot && <BottomSheet isOpen={rootComposer} onOpenChange={setRootComposer} label="Add another starting thought" purpose="form" height="tall">
        <VStack height="100%" justify="between" gap={4} padding={3}>
          <VStack gap={4}>
          <Heading level={2}>Add another starting thought</Heading>
          <Text color="secondary">A separate question, decision, or belief for this map.</Text>
          <TextArea label="Starting thought" value={rootDraft} onChange={setRootDraft} placeholder="What else do you want to explore?" rows={5} hasAutoFocus />
          </VStack>
          <HStack gap={2} hAlign="end">
            <Button label="Cancel" size="lg" onClick={() => setRootComposer(false)} />
            <Button label="Add thought" size="lg" variant="primary" isDisabled={!rootDraft.trim()} onClick={() => { if (!rootDraft.trim()) return; onCreateRoot(rootDraft.trim()); setRootDraft(""); setRootComposer(false); }} />
          </HStack>
        </VStack>
      </BottomSheet>}

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

          <HStack gap={2} paddingBlock={3} wrap="wrap">
            <Button label="Focus this branch" size="sm" onClick={() => { setFocusId(selectedNode.id); setPendingCenter(selectedNode.id); setDepth(3); }} />
            {!isTerminalType(selectedNode.type) && onAttachTree && <Button label="Attach a tree" size="sm" onClick={() => onAttachTree(selectedNode.id)} />}
          </HStack>

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
