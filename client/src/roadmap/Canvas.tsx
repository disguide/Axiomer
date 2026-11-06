import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  Panel,
  useStore,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Minus, Plus } from "lucide-react";
import { ownPosition, type Point } from "./layoutStorage";
import { connectThought, indexGraph, layoutRoadmap, type Roadmap, type Thought } from "./model";

type ThoughtNode = Node<{
  thought: Thought;
  active: boolean;
  anchor: boolean;
  faded: boolean;
  editable: boolean;
}>;
function ThoughtCard({ data }: NodeProps<ThoughtNode>) {
  return (
    <div
      className={`thought-node ${data.active ? "active" : ""} ${data.anchor ? "anchor" : ""} ${data.faded ? "faded" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={data.editable ? "connection-handle" : "invisible-handle"}
        aria-label="Connect into this thought"
      />
      <span className="node-dot" />
      <div>
        {data.anchor && <small>STARTING VALUE</small>}
        <p>{data.thought.text}</p>
        {!!data.thought.sources?.length && <span className="node-sources">{data.thought.sources.length} source{data.thought.sources.length === 1 ? "" : "s"}</span>}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={data.editable ? "connection-handle" : "invisible-handle"}
        aria-label="Connect from this thought"
      />
    </div>
  );
}
const nodeTypes = { thought: ThoughtCard };
function MapContent({
  graph,
  selected,
  overview,
  onSelect,
  reducedMotion,
  editable,
  manualPositions,
  arrangeVersion,
  fitVersion,
  onMove,
  onConnect,
  onEdgeSelect,
}: {
  graph: Roadmap;
  selected: string | null;
  overview: boolean;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  editable: boolean;
  manualPositions: Record<string, Point>;
  arrangeVersion: number;
  fitVersion: number;
  onMove: (id: string, position: Point) => void;
  onConnect: (from: string, to: string) => void;
  onEdgeSelect: (id: string) => void;
}) {
  const [dragPositions, setDragPositions] = useState<Record<string, Point>>(() => Object.create(null));
  useEffect(() => setDragPositions(Object.create(null)), [manualPositions]);
  const canEdit = editable && overview;
  const wholePositions = useMemo(() => layoutRoadmap(graph), [graph]);
  const index = useMemo(() => indexGraph(graph), [graph]);
  const { setCenter, fitView, zoomIn, zoomOut } = useReactFlow();
  const viewportWidth = useStore((state) => state.width);
  const viewportHeight = useStore((state) => state.height);
  const duration = reducedMotion ? 0 : 200;
  const pendingFit = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelAutoFit() {
    if (pendingFit.current !== null) clearTimeout(pendingFit.current);
    pendingFit.current = null;
  }
  // Search, the map caption and view controls occupy the top of the exposed
  // canvas. Pixel insets keep small maps out from under that fixed chrome.
  const framePadding = { top: "96px", bottom: viewportWidth <= 760 ? "24px" : "88px", left: "24px", right: "24px" } as const;
  const nearby = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set([
      selected,
      ...(index.parents.get(selected) || []),
      ...(index.children.get(selected) || []),
    ]);
  }, [selected, index]);
  const positions = useMemo(
    () =>
      overview
        ? wholePositions
        : layoutRoadmap({
            ...graph,
            anchor: selected,
            nodes: graph.nodes.filter((n) => nearby.has(n.id)),
            edges: graph.edges.filter(
              (e) => nearby.has(e.from) && nearby.has(e.to),
            ),
          }),
    [overview, wholePositions, graph, selected, nearby],
  );
  const nodes = useMemo(
    () =>
      graph.nodes
        .filter((n) => overview || nearby.has(n.id))
        .map((n) => ({
          id: n.id,
          type: "thought",
          position: overview ? ownPosition(dragPositions, n.id) || ownPosition(manualPositions, n.id) || positions.get(n.id)! : positions.get(n.id)!,
          data: {
            thought: n,
            active: selected === n.id,
            anchor: graph.anchor === n.id,
            faded: !!selected && !nearby.has(n.id),
            editable: canEdit,
          },
          ariaLabel: n.text,
        })),
    [graph, positions, selected, nearby, overview, canEdit, manualPositions, dragPositions],
  );
  const visible = new Set(nodes.map((n) => n.id));
  const edges = graph.edges
    .filter((e) => visible.has(e.from) && visible.has(e.to))
    .map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      label: e.label || undefined,
      labelStyle: { fill: "#505c46", fontSize: 12 },
      labelBgStyle: { fill: "#f6f5f1" },
      interactionWidth: 24,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.from === selected || e.to === selected ? "#9b6848" : "#b8b8ad",
        width: 15,
        height: 15,
      },
      style: {
        stroke:
          e.from === selected || e.to === selected ? "#9b6848" : "#d4d0c7",
        strokeWidth: e.from === selected || e.to === selected ? 2 : 1.4,
      },
    }));
  useEffect(() => {
    const timer = setTimeout(() => {
      pendingFit.current = null;
      void fitView({
        padding: { top: "96px", bottom: viewportWidth <= 760 ? "24px" : "88px", left: "24px", right: "24px" },
        duration: reducedMotion ? 0 : 350,
        maxZoom: 0.95,
      });
    }, 60);
    pendingFit.current = timer;
    return () => clearTimeout(timer);
  }, [overview, fitView, reducedMotion, arrangeVersion, fitVersion, viewportWidth, viewportHeight, overview ? null : positions]);
  useEffect(() => {
    if (overview) return;
    const p = selected ? (overview ? ownPosition(manualPositions, selected) || positions.get(selected) : positions.get(selected)) : undefined;
    if (p)
      void setCenter(p.x + 120, p.y + 60, {
        zoom: 0.95,
        duration: reducedMotion ? 0 : 350,
      });
    else if (viewportWidth && viewportHeight)
      void fitView({ padding: { top: "96px", bottom: viewportWidth <= 760 ? "24px" : "88px", left: "24px", right: "24px" }, maxZoom: 0.95, duration: reducedMotion ? 0 : 250 });
  }, [selected, overview, setCenter, reducedMotion, viewportWidth, viewportHeight, fitView]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => onSelect(n.id)}
      nodesDraggable={canEdit}
      nodesConnectable={canEdit}
      edgesFocusable
      onNodesChange={(changes) => {
        if (!canEdit) return;
        const moves = changes.filter((c) => c.type === "position" && c.position);
        if (moves.length) setDragPositions((previous) => {
          const next: Record<string, Point> = Object.assign(Object.create(null), previous);
          for (const move of moves) if (move.type === "position" && move.position) next[move.id] = move.position;
          return next;
        });
      }}
      onNodeDragStop={(_, node) => { if (canEdit) onMove(node.id, node.position); }}
      onConnect={(connection) => {
        if (canEdit && connection.source && connection.target) onConnect(connection.source, connection.target);
      }}
      isValidConnection={(connection) => {
        if (!canEdit || !connection.source || !connection.target) return false;
        try { connectThought(graph, connection.source, connection.target); return true; }
        catch { return false; }
      }}
      onEdgeClick={(_, edge) => onEdgeSelect(edge.id)}
      minZoom={0.0005}
      maxZoom={1.8}
      fitView
      onlyRenderVisibleElements
      autoPanOnNodeFocus
      ariaLabelConfig={{
        "node.a11yDescription.default":
          "Press Enter to read this thought. Pan to explore the map.",
      }}
    >
      <Panel position="top-right" className="viewport-controls" aria-label="Map view controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => { cancelAutoFit(); void zoomOut({ duration }); }}><Minus size={16} /></button>
        <button type="button" aria-label="Fit map" title="Fit the visible map" onClick={() => { cancelAutoFit(); void fitView({ padding: framePadding, maxZoom: 0.95, duration }); }}>Fit</button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => { cancelAutoFit(); void zoomIn({ duration }); }}><Plus size={16} /></button>
      </Panel>
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#ddd9d0"
      />
    </ReactFlow>
  );
}
export default function Canvas(props: Parameters<typeof MapContent>[0]) {
  return (
    <ReactFlowProvider>
      <MapContent {...props} />
    </ReactFlowProvider>
  );
}
