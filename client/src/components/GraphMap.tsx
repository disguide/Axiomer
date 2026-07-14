import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EdgeType, Graph, GraphNode } from "@/lib/types";
import { isInert } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";

const GraphOverview = lazy(() => import("./GraphOverview"));

interface GraphMapProps {
  graph: Graph;
}

const NODE_W = 210;
const NODE_H = 40;

// Above this many nodes, the detail map opens collapsed to the roots so it
// stays readable — you expand the parts you care about (progressive
// disclosure is how a tree scales).
const COLLAPSE_THRESHOLD = 60;
// Below this zoom, hide labels/detail — the "country view" of detail mode.
const LABEL_ZOOM = 0.45;

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
  undercuts: "undercuts",
  presupposes: "presupposes",
  contradicts: "contradicts",
  exemplifies: "exemplifies",
  concedes: "concedes",
  qualifies: "qualifies",
  supersedes: "supersedes",
};

function edgeColor(type: EdgeType): string {
  if (type === "supports" || type === "argues-for" || type === "exemplifies")
    return "#16a34a";
  if (
    type === "argues-against" ||
    type === "objects-to" ||
    type === "undercuts" ||
    type === "contradicts"
  )
    return "#dc2626";
  if (type === "grounds-in") return "#ca8a04";
  if (type === "rebuts") return "#0d9488";
  if (type === "entails" || type === "presupposes") return "#7c3aed";
  return "#94a3b8";
}

type AxiomerNodeData = {
  node: GraphNode;
  dim: boolean;
  selected: boolean;
  collapsed: boolean;
  hidden: number; // descendants hidden beneath a collapsed node
  showLabel: boolean;
  onToggle: (id: string) => void;
};

function AxiomerFlowNode({ data }: NodeProps<Node<AxiomerNodeData>>) {
  const { node, dim, selected, collapsed, hidden, showLabel, onToggle } = data;
  const meta = NODE_META[node.type];
  const inert = isInert(node);
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
        opacity: dim ? 0.3 : inert ? 0.45 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span className="shrink-0 text-sm" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      {showLabel && (
        <span
          className={`truncate text-[11px] font-medium ${
            inert ? "text-slate-400 line-through" : "text-slate-700"
          }`}
        >
          {node.content}
        </span>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-200"
          title={collapsed ? `Expand ${hidden} hidden` : "Collapse"}
        >
          {collapsed ? `+${hidden}` : "−"}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { axiomer: AxiomerFlowNode };
const edgeTypes: EdgeTypes = {};

export default function GraphMap({ graph }: GraphMapProps) {
  const [mode, setMode] = useState<"detail" | "overview">("detail");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const rf = useRef<ReactFlowInstance<Node<AxiomerNodeData>, Edge> | null>(null);

  // Structural roots of the whole DAG (nodes with no structural parent).
  const rootIds = useMemo(
    () =>
      graph.nodes
        .filter((n) => G.getParents(graph, n.id).length === 0)
        .map((n) => n.id),
    [graph],
  );

  const subtreeSizes = useMemo(() => G.getSubtreeSizes(graph), [graph]);

  // Collapsed set. Large graphs start collapsed to the roots.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const initedFor = useRef<Graph | null>(null);
  useEffect(() => {
    if (initedFor.current === graph) return;
    initedFor.current = graph;
    if (graph.nodes.length > COLLAPSE_THRESHOLD) {
      // Collapse every node that has children — only roots show at first.
      setCollapsed(
        new Set(
          graph.nodes
            .filter((n) => (subtreeSizes.get(n.id) ?? 0) > 0)
            .map((n) => n.id),
        ),
      );
    } else {
      setCollapsed(new Set());
    }
  }, [graph, subtreeSizes]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Visible frontier: descend from roots, stop at collapsed nodes.
  const visibleIds = useMemo(() => {
    const visible = new Set<string>();
    const queue = [...rootIds];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (visible.has(id)) continue;
      visible.add(id);
      if (!collapsed.has(id)) {
        for (const child of G.getChildren(graph, id)) {
          if (!visible.has(child.id)) queue.push(child.id);
        }
      }
    }
    return visible;
  }, [graph, rootIds, collapsed]);

  // The subgraph we actually lay out & render (fast: only the frontier).
  const visibleGraph = useMemo<Graph>(
    () => ({
      nodes: graph.nodes.filter((n) => visibleIds.has(n.id)),
      edges: graph.edges.filter(
        (e) => visibleIds.has(e.from) && visibleIds.has(e.to),
      ),
    }),
    [graph, visibleIds],
  );

  const positions = useMemo(
    () => layoutGraph(visibleGraph, NODE_W, NODE_H),
    [visibleGraph],
  );

  const highlighted = useMemo<Set<string> | null>(() => {
    if (!selectedId) return null;
    const set = G.getAncestors(graph, selectedId);
    for (const id of G.getDescendantIds(graph, selectedId)) set.add(id);
    set.add(selectedId);
    return set;
  }, [graph, selectedId]);

  const selectedNode = selectedId ? G.getNode(graph, selectedId) : undefined;
  const showLabels = zoom >= LABEL_ZOOM;

  const nodes = useMemo<Node<AxiomerNodeData>[]>(
    () =>
      visibleGraph.nodes.map((node) => ({
        id: node.id,
        type: "axiomer",
        position: positions[node.id] ?? { x: 0, y: 0 },
        data: {
          node,
          dim: highlighted ? !highlighted.has(node.id) : false,
          selected: node.id === selectedId,
          collapsed: collapsed.has(node.id),
          hidden: collapsed.has(node.id) ? subtreeSizes.get(node.id) ?? 0 : 0,
          showLabel: showLabels,
          onToggle: toggle,
        },
      })),
    [visibleGraph.nodes, positions, highlighted, selectedId, collapsed, subtreeSizes, showLabels, toggle],
  );

  const edges = useMemo<Edge[]>(
    () =>
      visibleGraph.edges.map((edge) => {
        const { parent, child } = G.edgeEndpoints(edge);
        const lit =
          !highlighted || (highlighted.has(parent) && highlighted.has(child));
        const color = edgeColor(edge.edgeType);
        const showLabel = showLabels && Boolean(highlighted) && lit;
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
            strokeDasharray:
              edge.edgeType === "contradicts" || edge.edgeType === "supersedes"
                ? "6 4"
                : undefined,
          },
        };
      }),
    [visibleGraph.edges, highlighted, showLabels],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) =>
      setSelectedId((cur) => (cur === node.id ? null : node.id)),
    [],
  );

  // Jump to a node: expand its whole ancestor chain, select it, center on it.
  const jumpTo = useCallback(
    (id: string) => {
      const ancestors = G.getAncestors(graph, id);
      setCollapsed((prev) => {
        const next = new Set(prev);
        for (const a of ancestors) next.delete(a);
        return next;
      });
      setSelectedId(id);
      // Let the frontier re-render, then center.
      setTimeout(() => rf.current?.fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.2 }), 60);
    },
    [graph],
  );

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const hit =
      graph.nodes.find((n) => n.content.toLowerCase().includes(q)) ?? null;
    if (hit) jumpTo(hit.id);
  };

  const expandAll = () => {
    // Rendering every node as DOM is the one thing that doesn't scale; warn
    // before forcing it on a large graph (Overview is the better whole-view).
    if (
      graph.nodes.length > 800 &&
      !window.confirm(
        `Expand all ${graph.nodes.length} nodes? That renders every node at once and may be slow. For the whole picture, use Overview instead.`,
      )
    )
      return;
    setCollapsed(new Set());
  };
  const collapseAll = () =>
    setCollapsed(
      new Set(
        graph.nodes
          .filter((n) => (subtreeSizes.get(n.id) ?? 0) > 0)
          .map((n) => n.id),
      ),
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
      {/* Toolbar */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setMode("detail")}
            className={`rounded px-2 py-1 ${mode === "detail" ? "bg-slate-800 text-white" : "text-slate-600"}`}
            title="Street view — readable pills you can work with"
          >
            Detail
          </button>
          <button
            type="button"
            onClick={() => setMode("overview")}
            className={`rounded px-2 py-1 ${mode === "overview" ? "bg-slate-800 text-white" : "text-slate-600"}`}
            title="Country view — the whole territory as a brain map"
          >
            Overview
          </button>
        </div>
        <form onSubmit={runSearch} className="flex items-center gap-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search & jump…"
            className="w-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </form>
        {mode === "detail" && (
          <div className="inline-flex gap-1 text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600 shadow-sm hover:bg-slate-100"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600 shadow-sm hover:bg-slate-100"
            >
              Collapse
            </button>
          </div>
        )}
        <span className="rounded bg-white/80 px-2 py-1 text-[10px] text-slate-400 shadow-sm">
          {graph.nodes.length} nodes · {mode === "detail" ? `${visibleGraph.nodes.length} shown` : "all"}
        </span>
      </div>

      {mode === "overview" ? (
        <Suspense fallback={<p className="p-8 text-center text-sm text-slate-400">Rendering overview…</p>}>
          <GraphOverview graph={graph} onDive={(id) => { setMode("detail"); jumpTo(id); }} />
        </Suspense>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(inst) => (rf.current = inst)}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          onMove={(_: unknown, vp: Viewport) => setZoom(vp.zoom)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onlyRenderVisibleElements
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
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
      )}

      {selectedNode && mode === "detail" && (
        <div className="absolute right-3 top-3 z-10 max-h-[calc(78vh-1.5rem)] w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
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
          {selectedNode.status && selectedNode.status !== "active" && (
            <p className="mt-1.5 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              {selectedNode.status.toUpperCase()}
              {selectedNode.statusMeta?.reason ? ` — ${selectedNode.statusMeta.reason}` : ""}
            </p>
          )}
          {selectedNode.contentKind && (
            <p className="mt-1.5 text-[11px] text-slate-400">kind: {selectedNode.contentKind}</p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Highlighting its full lineage. Click the background to clear.
          </p>
        </div>
      )}
    </div>
  );
}
