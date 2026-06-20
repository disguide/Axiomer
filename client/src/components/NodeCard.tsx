import { useState } from "react";
import type { GraphNode } from "@/lib/types";
import { NODE_META } from "@/lib/meta";

interface NodeCardProps {
  node: GraphNode;
  grounded: boolean | null; // only questions get a badge; null = no badge
  ungrounded?: boolean; // argument/position that doesn't yet reach a foundation
  childCount?: number;
  hasChildren: boolean;
  expanded: boolean;
  canAddChild: boolean;
  canFocus?: boolean;
  onToggle: () => void;
  onFocus?: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onAddChild: () => void;
}

export default function NodeCard({
  node,
  grounded,
  ungrounded = false,
  childCount = 0,
  hasChildren,
  expanded,
  canAddChild,
  canFocus = false,
  onToggle,
  onFocus,
  onEdit,
  onDelete,
  onAddChild,
}: NodeCardProps) {
  const meta = NODE_META[node.type];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.content);

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) onEdit(trimmed);
    else setDraft(node.content);
    setEditing(false);
  };

  return (
    <div
      className={`rounded-md border bg-white shadow-sm ${
        ungrounded ? "border-amber-300 ring-1 ring-amber-200/60" : "border-slate-200"
      }`}
      style={{ borderLeft: `5px solid ${meta.color}` }}
    >
      <div className="flex items-start gap-2 p-3">
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="mt-0.5 w-5 shrink-0 text-slate-400 hover:text-slate-700"
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="mt-0.5 w-5 shrink-0 text-center text-slate-300">
            •
          </span>
        )}

        <span
          className="mt-0.5 shrink-0 text-lg leading-none"
          style={{ color: meta.color }}
          aria-hidden
        >
          {meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            {grounded !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  grounded
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {grounded ? "FULLY GROUNDED" : "OPEN"}
              </span>
            )}
            {ungrounded && (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                title="This chain hasn't reached a value, principle, or epistemic limit yet"
              >
                NEEDS GROUNDING
              </span>
            )}
            {hasChildren && !expanded && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {childCount} hidden
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-1">
              <textarea
                className="w-full resize-y rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
                rows={2}
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
                  if (e.key === "Escape") {
                    setDraft(node.content);
                    setEditing(false);
                  }
                }}
              />
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(node.content);
                    setEditing(false);
                  }}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 break-words text-sm text-slate-800">
              {node.content}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1 text-xs">
            {canFocus && onFocus && (
              <button
                type="button"
                onClick={onFocus}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Focus this subtree"
              >
                ⤢ Focus
              </button>
            )}
            {canAddChild && (
              <button
                type="button"
                onClick={onAddChild}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Add child node"
              >
                + Add
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDraft(node.content);
                setEditing(true);
              }}
              className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Edit content"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded px-2 py-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              title="Delete node and descendants"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
