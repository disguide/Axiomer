import { useMemo, useState } from "react";
import type { GraphNode, NodeType } from "@/lib/types";
import { isTerminalType } from "@/lib/types";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";

interface AddNodeFormProps {
  parent: GraphNode;
  existingValues: GraphNode[];
  onAdd: (type: NodeType, content: string) => void;
  onLinkValue: (valueId: string) => void;
  onClose: () => void;
}

export default function AddNodeForm({
  parent,
  existingValues,
  onAdd,
  onLinkValue,
  onClose,
}: AddNodeFormProps) {
  const options = ALLOWED_CHILDREN[parent.type];
  const [type, setType] = useState<NodeType>(options[0]);
  const [content, setContent] = useState("");
  // For terminal types: create a new bedrock node, or link an existing value.
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [valueId, setValueId] = useState<string>(existingValues[0]?.id ?? "");

  const meta = NODE_META[type];
  const showLinkOption = useMemo(
    () => isTerminalType(type) && existingValues.length > 0,
    [type, existingValues.length],
  );

  const submit = () => {
    if (showLinkOption && mode === "existing") {
      if (valueId) onLinkValue(valueId);
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
              Choose an existing value
            </label>
            <select
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
              value={valueId}
              onChange={(e) => setValueId(e.target.value)}
            >
              {existingValues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.content}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Reusing a value creates convergence across questions.
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
