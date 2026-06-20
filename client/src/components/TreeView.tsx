import { useState } from "react";
import type { Graph, GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import * as G from "@/lib/graph";
import NodeCard from "./NodeCard";
import AddNodeForm from "./AddNodeForm";

interface TreeViewProps {
  graph: Graph;
  onAddNode: (type: NodeType, content: string, parentId: string) => void;
  onLinkValue: (argumentId: string, valueId: string) => void;
  onEditNode: (nodeId: string, content: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export default function TreeView({
  graph,
  onAddNode,
  onLinkValue,
  onEditNode,
  onDeleteNode,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand root questions by default so the seed is visible on load.
    return new Set(G.getRootQuestions(graph).map((n) => n.id));
  });
  const [addingTo, setAddingTo] = useState<GraphNode | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirmDelete = (node: GraphNode) => {
    const count = G.countDescendants(graph, node.id);
    const msg =
      count > 0
        ? `Delete this node and its ${count} descendant${
            count === 1 ? "" : "s"
          }? This cannot be undone.`
        : "Delete this node? This cannot be undone.";
    if (window.confirm(msg)) onDeleteNode(node.id);
  };

  const renderNode = (node: GraphNode, depth: number) => {
    const children = G.getChildren(graph, node.id);
    const isExpanded = expanded.has(node.id);
    const grounded =
      node.type === "question" ? G.isFullyGrounded(graph, node.id) : null;

    return (
      <div key={node.id} className="mt-2">
        <div style={{ marginLeft: depth * 20 }}>
          <NodeCard
            node={node}
            grounded={grounded}
            hasChildren={children.length > 0}
            expanded={isExpanded}
            canAddChild={!isTerminalType(node.type)}
            onToggle={() => toggle(node.id)}
            onEdit={(content) => onEditNode(node.id, content)}
            onDelete={() => confirmDelete(node)}
            onAddChild={() => setAddingTo(node)}
          />
        </div>
        {isExpanded &&
          children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const roots = G.getRootQuestions(graph);

  return (
    <div>
      {roots.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No questions yet. Click “New Question” to start a tree.
        </p>
      ) : (
        roots.map((node) => renderNode(node, 0))
      )}

      {addingTo && (
        <AddNodeForm
          parent={addingTo}
          existingValues={G.getValues(graph)}
          onAdd={(type, content) => onAddNode(type, content, addingTo.id)}
          onLinkValue={(valueId) => onLinkValue(addingTo.id, valueId)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  );
}
