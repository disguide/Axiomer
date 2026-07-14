// The Canvas — the "just dump boxes and draw arrows" surface. Add plain boxes,
// drag them around, connect them by hand. No types, no structure required.
// Then press "Label & organize" and the AI proposes how to type and arrange
// it — you approve, reject, or go deeper (propose-and-review, like a coding
// agent's plan). Built on React Flow (already a dependency) in editable mode.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Graph, GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import { layoutGraph } from "@/lib/flowLayout";
import { loadAIConfig } from "@/lib/ai/provider";
import { runAgent, type AgentRun } from "@/lib/ai/agents";
import { applyOp, validateOp, type ProposalOp } from "@/lib/proposals";

interface CanvasBoardProps {
  graph: Graph;
  readOnly?: boolean;
  onAddBox: (content: string, x: number, y: number) => string;
  onMoveNode: (id: string, x: number, y: number) => void;
  onConnect: (fromId: string, toId: string) => void;
  onEditNode: (id: string, content: string) => void;
  onRemoveBox: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onApplyOp: (op: ProposalOp) => void;
  onOpenAgents: () => void;
}

const BOX_W = 180;

type BoxData = {
  node: GraphNode;
  onEdit: (id: string, content: string) => void;
  readOnly: boolean;
};

// A plain, editable box. Double-click to edit its text.
function BoxNode({ data, selected }: NodeProps<Node<BoxData>>) {
  const { node, onEdit, readOnly } = data;
  const meta = NODE_META[node.type];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.content);
  const typed = node.type !== "unlabeled";
  return (
    <div
      className="rounded-md border bg-white px-2.5 py-2 shadow-sm"
      style={{
        width: BOX_W,
        borderColor: selected ? meta.color : "#cbd5e1",
        borderLeft: `4px solid ${meta.color}`,
        boxShadow: selected ? `0 0 0 3px ${meta.color}44` : undefined,
      }}
      onDoubleClick={() => {
        if (!readOnly) {
          setDraft(node.content);
          setEditing(true);
        }
      }}
    >
      <Handle type="target" position={Position.Top} />
      {typed && (
        <div className="mb-0.5 text-[9px] font-semibold tracking-wide" style={{ color: meta.color }}>
          {meta.icon} {meta.label}
        </div>
      )}
      {editing ? (
        <textarea
          autoFocus
          className="w-full resize-none rounded border border-slate-300 p-1 text-[11px] focus:outline-none"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const t = draft.trim();
            if (t) onEdit(node.id, t);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const t = draft.trim();
              if (t) onEdit(node.id, t);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <div className="whitespace-pre-wrap break-words text-[11px] text-slate-700">
          {node.content || <span className="text-slate-300">empty — double-click to write</span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes: NodeTypes = { box: BoxNode };

export default function CanvasBoard({
  graph,
  readOnly = false,
  onAddBox,
  onMoveNode,
  onConnect,
  onEditNode,
  onRemoveBox,
  onDeleteEdge,
  onApplyOp,
  onOpenAgents,
}: CanvasBoardProps) {
  const rf = useRef<ReactFlowInstance<Node<BoxData>, Edge> | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  // Fallback layout for any node without a saved position (e.g. an imported
  // graph opened on the Canvas for the first time).
  const fallback = useMemo(() => layoutGraph(graph, BOX_W, 70), [graph]);

  const nodes = useMemo<Node<BoxData>[]>(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        type: "box",
        position:
          node.x !== undefined && node.y !== undefined
            ? { x: node.x, y: node.y }
            : (fallback as Record<string, { x: number; y: number }>)[node.id] ?? {
                x: 0,
                y: 0,
              },
        data: { node, onEdit: onEditNode, readOnly },
        draggable: !readOnly,
      })),
    [graph.nodes, fallback, onEditNode, readOnly],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges
        .filter((e) => G.isStructuralEdge(e))
        .map((e) => {
          const { parent, child } = G.edgeEndpoints(e);
          const loose = e.edgeType === "connects-to";
          return {
            id: e.id,
            source: loose ? e.from : parent,
            target: loose ? e.to : child,
            type: "default",
            animated: false,
            style: { stroke: loose ? "#94a3b8" : "#64748b", strokeWidth: 1.5 },
            label: loose ? undefined : e.edgeType.replace(/-/g, " "),
            labelStyle: { fontSize: 9, fill: "#475569" },
          };
        }),
    [graph.edges],
  );

  const handleConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) onConnect(c.source, c.target);
    },
    [onConnect],
  );

  const addBoxAtCenter = () => {
    const inst = rf.current;
    // Cascade each new box so consecutive adds don't stack on top of each other.
    const stagger = (graph.nodes.length % 8) * 26;
    let x = 100 + stagger;
    let y = 100 + stagger;
    if (inst) {
      const c = inst.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      x = c.x - BOX_W / 2 + stagger;
      y = c.y - 120 + stagger;
    }
    onAddBox("", x, y);
  };

  const label = async () => {
    const config = loadAIConfig();
    if (!config) {
      onOpenAgents();
      return;
    }
    setRunning(true);
    setError(null);
    setRun(null);
    setApplied(new Set());
    try {
      setRun(await runAgent(config, graph, "label"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const acceptAll = () => {
    if (!run) return;
    let g = graph;
    const done = new Set(applied);
    run.parsed.proposal.ops.forEach((op, i) => {
      if (done.has(i) || !validateOp(g, op).ok) return;
      onApplyOp(op);
      g = applyOp(g, op);
      done.add(i);
    });
    setApplied(done);
  };

  const describeOp = (op: ProposalOp): string => {
    const name = (id: string) => {
      const n = G.getNode(graph, id);
      return n ? `“${n.content.slice(0, 48)}”` : `[${id}]`;
    };
    switch (op.op) {
      case "relabel-node":
        return `Label ${name(op.nodeId)} as ${NODE_META[op.type]?.label ?? op.type}`;
      case "add-node":
        return `Add ${NODE_META[op.type]?.label ?? op.type} under ${name(op.parentId)}: “${op.content}”`;
      case "link-value":
        return `Ground ${name(op.argumentId)} in ${name(op.valueId)}`;
      case "merge-terminals":
        return `Merge ${name(op.dropId)} into ${name(op.keepId)}`;
      case "set-status":
        return `Mark ${name(op.nodeId)} ${op.status}`;
      case "add-contradiction":
        return `${name(op.aId)} contradicts ${name(op.bId)}`;
    }
  };

  const boxCount = graph.nodes.filter((n) => n.type === "unlabeled").length;

  return (
    <div className="relative h-[78vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {/* Toolbar */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        {!readOnly && (
          <button
            type="button"
            onClick={addBoxAtCenter}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700"
          >
            + Add box
          </button>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={label}
            disabled={running}
            className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-600 disabled:opacity-40"
            title="Let your AI propose how to type and organize these boxes"
          >
            {running ? "Thinking…" : "✨ Label & organize"}
          </button>
        )}
        <span className="rounded bg-white/85 px-2 py-1 text-[10px] text-slate-500 shadow-sm">
          {graph.nodes.length} boxes{boxCount > 0 ? ` · ${boxCount} unlabeled` : ""} · drag to move · drag between boxes to link · double-click to edit
        </span>
      </div>

      {error && (
        <div className="absolute left-3 top-14 z-10 max-w-md rounded bg-rose-50 p-2 text-[11px] text-rose-600 shadow">
          {error}
        </div>
      )}

      {/* AI proposal review */}
      {run && (
        <div className="absolute right-3 top-3 z-10 max-h-[calc(78vh-1.5rem)] w-80 overflow-auto rounded-lg border border-violet-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-violet-800">AI proposal</h3>
            <button
              type="button"
              onClick={() => setRun(null)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            {run.parsed.proposal.summary || "Proposed structure:"}
          </p>
          {run.parsed.proposal.ops.length > 1 && !readOnly && (
            <button
              type="button"
              onClick={acceptAll}
              className="mt-2 rounded bg-violet-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-violet-600"
            >
              Approve all
            </button>
          )}
          <ul className="mt-2 space-y-1.5">
            {run.parsed.proposal.ops.map((op, i) => {
              const isApplied = applied.has(i);
              const ok = isApplied || validateOp(graph, op).ok;
              return (
                <li key={i} className="rounded-md bg-slate-50 p-2 ring-1 ring-slate-200">
                  <p className="text-[11px] text-slate-700">{describeOp(op)}</p>
                  {!readOnly &&
                    (isApplied ? (
                      <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ✓ approved
                      </span>
                    ) : (
                      <div className="mt-1 flex gap-1.5">
                        <button
                          type="button"
                          disabled={!ok}
                          onClick={() => {
                            onApplyOp(op);
                            setApplied((p) => new Set(p).add(i));
                          }}
                          className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplied((p) => new Set(p).add(i))}
                          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                        >
                          Skip
                        </button>
                      </div>
                    ))}
                </li>
              );
            })}
            {run.parsed.proposal.ops.length === 0 && (
              <li className="text-[11px] text-slate-400">
                The AI proposed no changes. Add more boxes or connections and try again.
              </li>
            )}
          </ul>
          {run.parsed.invalid.length > 0 && (
            <p className="mt-2 text-[10px] text-slate-400">
              {run.parsed.invalid.length} suggestion(s) rejected by validation.
            </p>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(inst) => (rf.current = inst)}
        onConnect={handleConnect}
        onNodeDragStop={(_, n) => onMoveNode(n.id, n.position.x, n.position.y)}
        onNodesDelete={(ns) => ns.forEach((n) => onRemoveBox(n.id))}
        onEdgesDelete={(es) => es.forEach((e) => onDeleteEdge(e.id))}
        nodesConnectable={!readOnly}
        nodesDraggable={!readOnly}
        elementsSelectable
        onDoubleClick={(e) => {
          // Double-click empty canvas to drop a box there.
          if (readOnly || !rf.current) return;
          const target = e.target as HTMLElement;
          if (!target.classList.contains("react-flow__pane")) return;
          const p = rf.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          onAddBox("", p.x - BOX_W / 2, p.y);
        }}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          nodeColor={(n) => NODE_META[(n.data as BoxData).node.type].color}
          maskColor="rgba(248,250,252,0.7)"
        />
      </ReactFlow>

      {graph.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg bg-white/80 px-4 py-3 text-center text-sm text-slate-400">
            Empty canvas. Hit <span className="font-medium text-slate-600">+ Add box</span> or
            double-click anywhere to start dumping ideas — link them, then let the AI organize.
          </p>
        </div>
      )}
    </div>
  );
}
