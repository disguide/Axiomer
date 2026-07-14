import { useMemo, useRef, useState } from "react";
import type { ContentKind, GraphNode, NodeType } from "@/lib/types";
import { CONTENT_KINDS, isTerminalType } from "@/lib/types";
import type { AddNodeOpts } from "@/lib/graph";
import { similarity } from "@/lib/graph";
import { ALLOWED_CHILDREN, NODE_FAMILIES, NODE_META } from "@/lib/meta";

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
  // Typeable options exclude the write-first "unlabeled" staging type.
  const options: NodeType[] = ALLOWED_CHILDREN[parent.type].filter(
    (t) => t !== "unlabeled",
  );
  // Write-first is the default: you capture the thought, label later. Type is
  // "unlabeled" until you choose to "pick a type now".
  const [labelNow, setLabelNow] = useState(false);
  const [type, setType] = useState<NodeType>(options[0]);
  const [content, setContent] = useState("");
  // For terminal types: create a new bedrock node, or link an existing one.
  const [mode, setMode] = useState<"new" | "existing">("new");
  // For objections under an inference-bearing parent: rebut vs undercut.
  const [attackMode, setAttackMode] = useState<"rebut" | "undercut">("rebut");
  const [contentKind, setContentKind] = useState<ContentKind | "">("");
  const [addedCount, setAddedCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const effectiveType: NodeType = labelNow ? type : "unlabeled";
  const showAttackMode =
    labelNow && type === "objection" && UNDERCUTTABLE.has(parent.type);

  const meta = NODE_META[effectiveType];
  // Existing terminals of the SAME type are the valid link/dedup targets.
  const sameType = useMemo(
    () => existingTerminals.filter((t) => t.type === effectiveType),
    [existingTerminals, effectiveType],
  );
  const [valueId, setValueId] = useState<string>("");
  const showLinkOption = isTerminalType(effectiveType) && sameType.length > 0;

  // The picker shows only this parent's allowed types, grouped by family.
  const families = useMemo(
    () =>
      NODE_FAMILIES.map((f) => ({
        ...f,
        types: f.types.filter((t) => options.includes(t)),
      })).filter((f) => f.types.length > 0),
    [options],
  );

  // Near-duplicates of what the user is typing — nudge "link instead".
  const similar = useMemo(() => {
    if (!isTerminalType(effectiveType) || !content.trim()) return [];
    return sameType
      .map((node) => ({ node, score: similarity(content, node.content) }))
      .filter((m) => m.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [content, effectiveType, sameType]);

  const linkTarget = valueId || sameType[0]?.id || "";

  const pickType = (t: NodeType) => {
    setType(t);
    setLabelNow(true);
    setMode("new");
    setAttackMode("rebut");
  };

  // Returns true if something was actually added/linked.
  const commit = (): boolean => {
    if (showLinkOption && mode === "existing") {
      if (!linkTarget) return false;
      onLinkValue(linkTarget);
      return true;
    }
    const trimmed = content.trim();
    if (!trimmed) return false;
    const opts: AddNodeOpts = {};
    if (showAttackMode && attackMode === "undercut") opts.edgeType = "undercuts";
    if (contentKind && KINDED.has(effectiveType)) opts.contentKind = contentKind;
    onAdd(effectiveType, trimmed, Object.keys(opts).length > 0 ? opts : undefined);
    return true;
  };

  const submitAndClose = () => {
    if (commit()) onClose();
  };

  // Keep the modal open for rapid sibling entry (same parent, same type).
  const submitAndContinue = () => {
    if (!commit()) return;
    setContent("");
    setAddedCount((n) => n + 1);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Add a node</h2>
            <p className="mt-1 text-xs text-slate-500">
              Under:{" "}
              <span style={{ color: NODE_META[parent.type].color }}>
                {NODE_META[parent.type].icon}
              </span>{" "}
              <span className="font-medium text-slate-700">{parent.content}</span>{" "}
              <span className="text-slate-400">
                ({NODE_META[parent.type].label})
              </span>
            </p>
          </div>
          {addedCount > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {addedCount} added
            </span>
          )}
        </div>

        {/* Write-first by default: capture the thought, label later. The type
            picker only appears if you choose to type it now. */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {labelNow
              ? "Pick the type that fits."
              : "Just write your thought — you (or the Labeler) can type it later."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (labelNow) {
                setLabelNow(false);
              } else {
                setLabelNow(true);
                setType(options[0]);
              }
            }}
            className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
          >
            {labelNow ? "← Just write, label later" : "Pick a type now →"}
          </button>
        </div>

        {labelNow && (
          <div className="mt-2 space-y-2">
            {families.map((f) => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {f.label} <span className="font-normal">— {f.hint}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {f.types.map((t) => {
                    const m = NODE_META[t];
                    const active = t === type;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => pickType(t)}
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? "border-transparent text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                        }`}
                        style={active ? { backgroundColor: m.color } : undefined}
                        title={m.description}
                      >
                        <span style={active ? undefined : { color: m.color }}>
                          {m.icon}
                        </span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">
          <span className="font-medium" style={{ color: meta.color }}>
            {meta.icon} {meta.label}:
          </span>{" "}
          {meta.description}
        </p>

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
              ref={textareaRef}
              className="mt-1 w-full resize-y rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
              rows={3}
              autoFocus
              placeholder={meta.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  if (e.shiftKey) submitAndContinue();
                  else submitAndClose();
                }
              }}
            />
            {labelNow && KINDED.has(effectiveType) && (
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

        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="mr-auto text-[10px] text-slate-400">
            ⌘↵ add · ⌘⇧↵ add &amp; next
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            {addedCount > 0 ? "Done" : "Cancel"}
          </button>
          {!(showLinkOption && mode === "existing") && (
            <button
              type="button"
              onClick={submitAndContinue}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              title="Add this node and keep the form open for a sibling"
            >
              Add &amp; another
            </button>
          )}
          <button
            type="button"
            onClick={submitAndClose}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            {showLinkOption && mode === "existing"
              ? "Link value"
              : labelNow
                ? "Add node"
                : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}
