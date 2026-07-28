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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-900">Add a node</h2>
        <p className="mt-1 text-xs text-slate-500">
          Parent:{" "}
          <span className="font-medium text-slate-700">{parent.content}</span>{" "}
          <span className="text-slate-400">
            ({NODE_META[parent.type].label})
          </span>
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-700">
          Node type
        </label>
        <select
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          value={type}
          onChange={(e) => {
            setType(e.target.value as NodeType);
            setMode("new");
          }}
        >
          {[
            { label: "Claims", types: ["claim", "premise"] },
            { label: "Support", types: ["support"] },
            { label: "Attacks", types: ["attack"] },
            { label: "Evidence", types: ["source"] },
            { label: "Foundations", types: ["value", "limit"] },
            { label: "Meta", types: ["note"] },
          ].map(group => {
            const validOptions = group.types.filter(t => options.includes(t as NodeType));
            if (validOptions.length === 0) return null;
            return (
              <optgroup key={group.label} label={group.label}>
                {validOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {NODE_META[opt as NodeType].icon} {NODE_META[opt as NodeType].label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {showLinkOption && (
          <div className="mt-4 flex gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === "new"}
                onChange={() => setMode("new")}
                className="accent-sky-600"
              />
              Create new
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
                className="accent-sky-600"
              />
              Link to existing
            </label>
          </div>
        )}

        {showLinkOption && mode === "existing" ? (
          <>
            <label className="mt-4 block text-xs font-medium text-slate-700">
              Choose an existing {meta.label.toLowerCase()}
            </label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
              Reusing a bedrock node creates convergence across claims.
            </p>
          </>
        ) : (
          <>
            <label className="mt-4 block text-xs font-medium text-slate-700">
              {meta.prompt}
            </label>
            <textarea
              className="mt-1.5 w-full resize-none overflow-hidden rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400"
              rows={1}
              autoFocus
              placeholder={meta.placeholder}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = "inherit";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
            {similar.length > 0 && (
              <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-[11px] font-medium text-indigo-700">
                  Similar {meta.label.toLowerCase()}
                  {similar.length === 1 ? "" : "s"} already exist — link instead
                  to keep convergence:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {similar.map(({ node }) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onLinkValue(node.id);
                          onClose();
                        }}
                        className="flex w-full items-center gap-2 rounded-md bg-white border border-transparent px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-100 hover:border-indigo-200 transition-all"
                      >
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {node.content}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-sm">
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

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            {showLinkOption && mode === "existing" ? "Link value" : "Add node"}
          </button>
        </div>
      </div>
    </div>
  );
}
