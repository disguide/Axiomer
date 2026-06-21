import { useMemo, useState } from "react";
import type { GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { similarity } from "@/lib/graph";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";

interface AddNodeFormProps {
  parent: GraphNode;
  existingTerminals: GraphNode[];
  onAdd: (type: NodeType, content: string) => void;
  onLinkValue: (valueId: string) => void;
  onClose: () => void;
}

export default function AddNodeForm({
  parent,
  existingTerminals,
  onAdd,
  onLinkValue,
  onClose,
}: AddNodeFormProps) {
  const options = ALLOWED_CHILDREN[parent.type];
  const [type, setType] = useState<NodeType>(options[0]);
  const [content, setContent] = useState("");
  // For terminal types: create a new bedrock node, or link an existing one.
  const [mode, setMode] = useState<"new" | "existing">("new");

  const meta = NODE_META[type];
  // Existing terminals of the SAME type are the valid link/dedup targets.
  const sameType = useMemo(
    () => existingTerminals.filter((t) => t.type === type),
    [existingTerminals, type],
  );
  const [valueId, setValueId] = useState<string>("");
  const showLinkOption = isTerminalType(type) && sameType.length > 0;

  // Near-duplicates of what the user is typing — nudge "link instead".
  const similar = useMemo(() => {
    if (!isTerminalType(type) || !content.trim()) return [];
    return sameType
      .map((node) => ({ node, score: similarity(content, node.content) }))
      .filter((m) => m.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [content, type, sameType]);

  const linkTarget = valueId || sameType[0]?.id || "";

  const submit = () => {
    if (showLinkOption && mode === "existing") {
      if (linkTarget) onLinkValue(linkTarget);
      onClose();
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) return;
    onAdd(type, trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-slate-900">Add a node</h2>
        <p className="mt-1 text-xs text-slate-500">
          Parent:{" "}
          <span className="font-medium text-slate-700">{parent.content}</span>{" "}
          <span className="text-slate-400">
            ({NODE_META[parent.type].label})
          </span>
        </p>

        <label className="mt-4 block text-xs font-medium text-slate-700">
          Node type
        </label>
        <select
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
          value={type}
          onChange={(e) => {
            setType(e.target.value as NodeType);
            setMode("new");
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {NODE_META[opt].icon} {NODE_META[opt].label}
            </option>
          ))}
        </select>

        {showLinkOption && (
          <div className="mt-3 flex gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === "new"}
                onChange={() => setMode("new")}
              />
              Create new
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
              />
              Link to existing
            </label>
          </div>
        )}

        {showLinkOption && mode === "existing" ? (
          <>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              Choose an existing {meta.label.toLowerCase()}
            </label>
            <select
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
              value={linkTarget}
              onChange={(e) => setValueId(e.target.value)}
            >
              {sameType.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.content}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Reusing a bedrock node creates convergence across questions.
            </p>
          </>
        ) : (
          <>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              {meta.prompt}
            </label>
            <textarea
              className="mt-1 w-full resize-y rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
              rows={3}
              autoFocus
              placeholder={meta.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
            {similar.length > 0 && (
              <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 p-2">
                <p className="text-[11px] font-medium text-indigo-700">
                  Similar {meta.label.toLowerCase()}
                  {similar.length === 1 ? "" : "s"} already exist — link instead
                  to keep convergence:
                </p>
                <ul className="mt-1 space-y-1">
                  {similar.map(({ node }) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onLinkValue(node.id);
                          onClose();
                        }}
                        className="flex w-full items-center gap-1.5 rounded bg-white px-2 py-1 text-left text-xs text-slate-700 hover:bg-indigo-100"
                      >
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {node.content}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium text-indigo-600">
                          link
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            {showLinkOption && mode === "existing" ? "Link value" : "Add node"}
          </button>
        </div>
      </div>
    </div>
  );
}
