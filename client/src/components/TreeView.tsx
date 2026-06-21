import { useMemo, useState } from "react";
import type { Graph, GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { NODE_META } from "@/lib/meta";
import * as G from "@/lib/graph";
import NodeCard from "./NodeCard";
import AddNodeForm from "./AddNodeForm";

interface TreeViewProps {
  graph: Graph;
  focusId: string | null;
  onSetFocus: (id: string | null) => void;
  onAddNode: (type: NodeType, content: string, parentId: string) => void;
  onLinkValue: (argumentId: string, valueId: string) => void;
  onEditNode: (nodeId: string, content: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export default function TreeView({
  graph,
  focusId,
  onSetFocus,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand roots by default so the seed is visible on load.
    return new Set(G.getRoots(graph).map((n) => n.id));
  });
  const [addingTo, setAddingTo] = useState<GraphNode | null>(null);

  // Whole-graph acceptability, recomputed when the graph changes.
  const acceptability = useMemo(() => G.getAcceptability(graph), [graph]);

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
          }? This cannot be undone.`
        : "Delete this node? This cannot be undone.";
    if (window.confirm(msg)) {
      if (focusId === node.id) onSetFocus(null);
      onDeleteNode(node.id);
    }
  };

  const renderNode = (node: GraphNode, depth: number) => {
    const children = G.getChildren(graph, node.id);
    const isExpanded = expanded.has(node.id);
    const grounded =
      node.type === "question" ? G.isFullyGrounded(graph, node.id) : null;
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

    return (
      <div key={node.id}>
        <div className="py-1">
          <NodeCard
            node={node}
            grounded={grounded}
            ungrounded={ungrounded}
            acceptance={acceptance}
            childCount={children.length}
            hasChildren={children.length > 0}
            expanded={isExpanded}
            canAddChild={!isTerminalType(node.type)}
            canFocus={children.length > 0 && focusId !== node.id}
            onToggle={() => toggle(node.id)}
            onFocus={() => onSetFocus(node.id)}
            onEdit={(content) => onEditNode(node.id, content)}
            onDelete={() => confirmDelete(node)}
            onAddChild={() => setAddingTo(node)}
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
                All roots
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
          onAdd={(type, content) => onAddNode(type, content, addingTo.id)}
          onLinkValue={(valueId) => onLinkValue(addingTo.id, valueId)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
