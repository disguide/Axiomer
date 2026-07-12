import { useMemo, useState } from "react";
import type { ContentKind, GraphNode, NodeType } from "@/lib/types";
import { CONTENT_KINDS, isTerminalType } from "@/lib/types";
import type { AddNodeOpts } from "@/lib/graph";
import { similarity } from "@/lib/graph";
import { ALLOWED_CHILDREN, NODE_META } from "@/lib/meta";

// Parents whose objections can target the INFERENCE (undercut) rather than
// the claim itself (rebut) — arguments, warrants, and evidence.
const UNDERCUTTABLE = new Set<NodeType>([
  "argument-support",
  "argument-attack",
  "warrant",
  "evidence-empirical",
  "evidence-anecdotal",
]);

// Claim-bearing types that benefit from a content-kind facet.
const KINDED = new Set<NodeType>([
  "position",
  "argument-support",
  "argument-attack",
  "implication",
  "criterion",
  "presupposition",
  "warrant",
  "premise",
  "assumption",
]);

interface AddNodeFormProps {
  parent: GraphNode;
  existingTerminals: GraphNode[];
  onAdd: (type: NodeType, content: string, opts?: AddNodeOpts) => void;
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
  // For objections under an inference-bearing parent: rebut vs undercut.
  const [attackMode, setAttackMode] = useState<"rebut" | "undercut">("rebut");
  const [contentKind, setContentKind] = useState<ContentKind | "">("");
  const showAttackMode = type === "objection" && UNDERCUTTABLE.has(parent.type);

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
    const opts: AddNodeOpts = {};
    if (showAttackMode && attackMode === "undercut") opts.edgeType = "undercuts";
    if (contentKind && KINDED.has(type)) opts.contentKind = contentKind;
    onAdd(type, trimmed, Object.keys(opts).length > 0 ? opts : undefined);
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
            setAttackMode("rebut");
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {NODE_META[opt].icon} {NODE_META[opt].label}
            </option>
          ))}
        </select>

        {showAttackMode && (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-medium text-slate-600">
              What does this objection challenge?
            </p>
            <div className="mt-1 flex flex-col gap-1 text-xs text-slate-700">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={attackMode === "rebut"}
                  onChange={() => setAttackMode("rebut")}
                />
                The claim itself{" "}
                <span className="text-slate-400">(“it's false because…”)</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={attackMode === "undercut"}
                  onChange={() => setAttackMode("undercut")}
                />
                The inference{" "}
                <span className="text-slate-400">
                  (“this doesn't establish it here, even if it might be true”)
                </span>
              </label>
            </div>
          </div>
        )}

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
            {KINDED.has(type) && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <label
                  className="shrink-0"
                  title="What sort of statement is this? Normative conclusions need a normative link somewhere below (the is/ought firewall)."
                >
                  Kind (optional):
                </label>
                <select
                  className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:border-slate-400 focus:outline-none"
                  value={contentKind}
                  onChange={(e) => setContentKind(e.target.value as ContentKind | "")}
                >
                  <option value="">—</option>
                  {CONTENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
