import { useMemo, useState } from "react";
import type { Graph, GraphNode, NodeStatus, NodeType, ProofStandard } from "@/lib/types";
import { NODE_TYPES, isInert, isTerminalType } from "@/lib/types";
import type { AddNodeOpts } from "@/lib/graph";
import type { Stance } from "@/lib/commitment";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import NodeCard from "./NodeCard";
import AddNodeForm from "./AddNodeForm";

interface TreeViewProps {
  graph: Graph;
  readOnly?: boolean;
  focusId: string | null;
  stance?: Stance;
  onSetFocus: (id: string | null) => void;
  onAddNode: (
    type: NodeType,
    content: string,
    parentId: string,
    opts?: AddNodeOpts,
  ) => void;
  onLinkValue: (argumentId: string, valueId: string) => void;
  onEditNode: (nodeId: string, content: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSetStatus?: (nodeId: string, status: NodeStatus, reason?: string) => void;
  onSetProofStandard?: (questionId: string, standard: ProofStandard) => void;
  onAccept?: (nodeId: string) => void;
  onReject?: (nodeId: string) => void;
  onRelabelNode?: (nodeId: string, type: NodeType) => void;
}

// A raw note may be labeled as anything its parent legally allows (or, at a
// root, any real type).
function relabelChoices(graph: Graph, nodeId: string): NodeType[] {
  const parent = G.getParent(graph, nodeId);
  const pool = parent
    ? ALLOWED_CHILDREN[parent.type]
    : NODE_TYPES;
  return pool.filter((t) => t !== "unlabeled");
}

export default function TreeView({
  graph,
  readOnly = false,
  focusId,
  stance,
  onSetFocus,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
  onSetStatus,
  onSetProofStandard,
  onAccept,
  onReject,
  onRelabelNode,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand roots by default so the seed is visible on load.
    return new Set(G.getRoots(graph).map((n) => n.id));
  });
  const [addingTo, setAddingTo] = useState<GraphNode | null>(null);

  // Whole-graph acceptability, recomputed when the graph changes.
  const acceptability = useMemo(() => G.getAcceptability(graph), [graph]);
  // Active nodes whose parent is inert — flagged for review.
  const orphans = useMemo(() => G.getInertOrphans(graph), [graph]);

  // Every node that has children — the set "expand all" targets.
  const parentIds = useMemo(
    () =>
      graph.nodes
        .filter((n) => G.getChildren(graph, n.id).length > 0)
        .map((n) => n.id),
    [graph],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => setExpanded(new Set(parentIds));
  const collapseAll = () => setExpanded(new Set(G.getRoots(graph).map((n) => n.id)));

  const confirmDelete = (node: GraphNode) => {
    const count = G.countDescendants(graph, node.id);
    const msg =
      count > 0
        ? `Delete this node and its ${count} descendant${
            count === 1 ? "" : "s"
          }? This cannot be undone. (Tip: “⋯ → Retract” keeps it as a ghost instead.)`
        : "Delete this node? This cannot be undone. (Tip: “⋯ → Retract” keeps it as a ghost instead.)";
    if (window.confirm(msg)) {
      if (focusId === node.id) onSetFocus(null);
      onDeleteNode(node.id);
    }
  };

  const renderNode = (node: GraphNode, depth: number) => {
    const children = G.getChildren(graph, node.id);
    const isExpanded = expanded.has(node.id);
    const resolution =
      node.type === "question" ? G.getResolution(graph, node.id) : null;
    // Flag argument/position nodes that don't yet reach a foundation.
    const ungrounded =
      (node.type === "argument-support" ||
        node.type === "argument-attack" ||
        node.type === "position") &&
      !G.isNodeGrounded(graph, node.id);
    // Acceptability only matters for nodes that are actually under attack.
    const attacked = G.getAttackers(graph, node.id).length > 0;
    const acceptance = attacked
      ? (acceptability.get(node.id) ?? null)
      : null;
    const nodeStance = stance?.accepted.includes(node.id)
      ? ("accepted" as const)
      : stance?.rejected.includes(node.id)
        ? ("rejected" as const)
        : null;

    return (
      <div key={node.id}>
        <div className="py-1">
          <NodeCard
            node={node}
            resolution={resolution}
            ungrounded={ungrounded}
            acceptance={acceptance}
            orphaned={orphans.has(node.id)}
            stance={nodeStance}
            childCount={children.length}
            hasChildren={children.length > 0}
            expanded={isExpanded}
            readOnly={readOnly}
            canAddChild={!readOnly && !isTerminalType(node.type) && !isInert(node)}
            canFocus={children.length > 0 && focusId !== node.id}
            onToggle={() => toggle(node.id)}
            onFocus={() => onSetFocus(node.id)}
            onEdit={(content) => onEditNode(node.id, content)}
            onDelete={() => confirmDelete(node)}
            onAddChild={() => setAddingTo(node)}
            onSetStatus={
              onSetStatus && !readOnly
                ? (status, reason) => onSetStatus(node.id, status, reason)
                : undefined
            }
            onSetProofStandard={
              onSetProofStandard && !readOnly
                ? (standard) => onSetProofStandard(node.id, standard)
                : undefined
            }
            onAccept={onAccept ? () => onAccept(node.id) : undefined}
            onReject={onReject ? () => onReject(node.id) : undefined}
            relabelOptions={
              node.type === "unlabeled" ? relabelChoices(graph, node.id) : undefined
            }
            onRelabel={
              onRelabelNode && !readOnly
                ? (type) => onRelabelNode(node.id, type)
                : undefined
            }
          />
        </div>
        {isExpanded && children.length > 0 && (
          <div
            className="ml-3 border-l-2 pl-3"
            style={{ borderColor: `${NODE_META[node.type].color}33` }}
          >
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const roots = G.getRoots(graph);
  const focusNode = focusId ? G.getNode(graph, focusId) : undefined;

  // Breadcrumb trail from the focused node up to its root.
  const trail: GraphNode[] = [];
  if (focusNode) {
    let cur: GraphNode | undefined = focusNode;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      trail.unshift(cur);
      cur = G.getParent(graph, cur.id);
    }
  }

  return (
    <div>
      {roots.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Nothing here yet. Start top-down with “New Question”, or bottom-up with
          “New Premise”.
        </p>
      ) : (
        <>
          {focusNode ? (
            <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => onSetFocus(null)}
                className="rounded px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-100"
              >
                ← All trees
              </button>
              {trail.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  <span className="text-slate-300">/</span>
                  {i === trail.length - 1 ? (
                    <span className="max-w-[16rem] truncate font-medium text-slate-700">
                      {n.content}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetFocus(n.id)}
                      className="max-w-[10rem] truncate rounded px-1.5 py-0.5 hover:bg-slate-100"
                    >
                      {n.content}
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-100"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-100"
              >
                Collapse all
              </button>
            </div>
          )}

          {focusNode ? renderNode(focusNode, 0) : roots.map((n) => renderNode(n, 0))}
        </>
      )}

      {addingTo && (
        <AddNodeForm
          parent={addingTo}
          existingTerminals={G.getTerminals(graph)}
          onAdd={(type, content, opts) => onAddNode(type, content, addingTo.id, opts)}
          onLinkValue={(valueId) => onLinkValue(addingTo.id, valueId)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
