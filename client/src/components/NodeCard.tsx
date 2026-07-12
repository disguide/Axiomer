import { useState } from "react";
import type { GraphNode, NodeStatus, ProofStandard } from "@/lib/types";
import { PROOF_STANDARDS, isInert } from "@/lib/types";
import type { Acceptability, Resolution } from "@/lib/graph";
import { NODE_META } from "@/lib/meta";

// Claim-bearing types a user can take a stance on (accept/reject).
const STANCE_TYPES = new Set<GraphNode["type"]>([
  "position",
  "argument-support",
  "argument-attack",
  "implication",
  "premise",
  "criterion",
  "presupposition",
  "warrant",
  "assumption",
  "value",
  "principle",
  "epistemic-limit",
]);

const STATUS_LABEL: Record<NodeStatus, string> = {
  active: "ACTIVE",
  retracted: "RETRACTED",
  refuted: "REFUTED",
  invalid: "INVALID",
  superseded: "SUPERSEDED",
  merged: "MERGED",
};

const STANDARD_SHORT: Record<ProofStandard, string> = {
  preponderance: "preponderance",
  "clear-and-convincing": "clear & convincing",
  "beyond-reasonable-doubt": "beyond reasonable doubt",
  "dialectical-validity": "dialectical validity",
};

interface NodeCardProps {
  node: GraphNode;
  resolution: Resolution | null; // only questions get a badge; null = no badge
  ungrounded?: boolean; // argument/position that doesn't yet reach a foundation
  acceptance?: Acceptability | null; // defeat status; only when under attack
  orphaned?: boolean; // active node whose parent is inert
  stance?: "accepted" | "rejected" | null;
  childCount?: number;
  hasChildren: boolean;
  expanded: boolean;
  readOnly?: boolean;
  canAddChild: boolean;
  canFocus?: boolean;
  onToggle: () => void;
  onFocus?: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onSetStatus?: (status: NodeStatus, reason?: string) => void;
  onSetProofStandard?: (standard: ProofStandard) => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export default function NodeCard({
  node,
  resolution,
  ungrounded = false,
  acceptance = null,
  orphaned = false,
  stance = null,
  childCount = 0,
  hasChildren,
  expanded,
  readOnly = false,
  canAddChild,
  canFocus = false,
  onToggle,
  onFocus,
  onEdit,
  onDelete,
  onAddChild,
  onSetStatus,
  onSetProofStandard,
  onAccept,
  onReject,
}: NodeCardProps) {
  const meta = NODE_META[node.type];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.content);
  const [statusMenu, setStatusMenu] = useState(false);
  const inert = isInert(node);
  const stanceable = STANCE_TYPES.has(node.type) && !inert;

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) onEdit(trimmed);
    else setDraft(node.content);
    setEditing(false);
  };

  const setStatus = (status: NodeStatus) => {
    setStatusMenu(false);
    if (!onSetStatus) return;
    if (status === "active") {
      onSetStatus(status);
      return;
    }
    const reason =
      window.prompt(
        `Why is this node being marked ${STATUS_LABEL[status].toLowerCase()}? (optional)`,
      ) ?? undefined;
    onSetStatus(status, reason || undefined);
  };

  return (
    <div
      className={`rounded-md border bg-white shadow-sm ${
        inert
          ? "border-slate-200 opacity-60"
          : ungrounded
            ? "border-amber-300 ring-1 ring-amber-200/60"
            : orphaned
              ? "border-orange-300 ring-1 ring-orange-200/60"
              : stance === "accepted"
                ? "border-emerald-300 ring-1 ring-emerald-200/70"
                : stance === "rejected"
                  ? "border-rose-300 ring-1 ring-rose-200/70"
                  : "border-slate-200"
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
            {/* Asserted status first (editorial), computed standing second. */}
            {inert && node.status && (
              <span
                className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                title={node.statusMeta?.reason ?? "No force: excluded from grounding, attacks, and commitments"}
              >
                {STATUS_LABEL[node.status]}
              </span>
            )}
            {resolution && !inert && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  resolution.state === "resolved"
                    ? "bg-emerald-600 text-white"
                    : resolution.state === "grounded"
                      ? "bg-emerald-100 text-emerald-700"
                      : resolution.state === "dissolved"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-amber-100 text-amber-700"
                }`}
                title={
                  resolution.state === "resolved"
                    ? `A position survives at the "${STANDARD_SHORT[resolution.standard]}" standard`
                    : resolution.state === "grounded"
                      ? "Every chain reaches bedrock, but no position wins at the declared standard"
                      : resolution.state === "dissolved"
                        ? "A presupposition of this question fell — the question loses its footing"
                        : "Some chain hasn't reached a value, principle, or epistemic limit"
                }
              >
                {resolution.state === "resolved"
                  ? `RESOLVED · ${STANDARD_SHORT[resolution.standard]}`
                  : resolution.state === "grounded"
                    ? "FULLY GROUNDED"
                    : resolution.state === "dissolved"
                      ? "DISSOLVED"
                      : "OPEN"}
              </span>
            )}
            {ungrounded && !inert && (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                title="This chain hasn't reached a value, principle, or epistemic limit yet"
              >
                NEEDS GROUNDING
              </span>
            )}
            {orphaned && !inert && (
              <span
                className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
                title="A parent of this node is retracted/refuted — re-attach, retract, or keep as record"
              >
                PARENT INERT
              </span>
            )}
            {!inert && acceptance === "defeated" && (
              <span
                className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                title="An undefeated attack (objection/attack) currently defeats this node"
              >
                DEFEATED
              </span>
            )}
            {!inert && acceptance === "defended" && (
              <span
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                title="Survives every attack against it (each attacker is itself defeated)"
              >
                DEFENDED
              </span>
            )}
            {!inert && acceptance === "contested" && (
              <span
                className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                title="Undecided under grounded semantics (attack cycle)"
              >
                CONTESTED
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
            <p
              className={`mt-0.5 break-words text-sm ${
                inert
                  ? "text-slate-400 line-through decoration-slate-300"
                  : acceptance === "defeated"
                    ? "text-slate-400 line-through decoration-rose-300"
                    : "text-slate-800"
              }`}
            >
              {node.content}
            </p>
          )}

          {/* Question controls: declared proof standard (authoring only). */}
          {node.type === "question" && !readOnly && !editing && !inert && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
              <span title="How decisively must a position win for this question to count as resolved (Carneades proof standards)">
                standard:
              </span>
              <select
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-500 focus:border-slate-400 focus:outline-none"
                value={node.proofStandard ?? "preponderance"}
                onChange={(e) =>
                  onSetProofStandard?.(e.target.value as ProofStandard)
                }
              >
                {PROOF_STANDARDS.map((s) => (
                  <option key={s} value={s}>
                    {STANDARD_SHORT[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1 text-xs">
            {stanceable && onAccept && onReject && (
              <span className="mr-1 flex items-center gap-0.5" title="Your stance (personal — never changes the shared graph)">
                <button
                  type="button"
                  onClick={onAccept}
                  className={`rounded px-1.5 py-1 ${
                    stance === "accepted"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                  title={stance === "accepted" ? "Accepted — click to clear" : "Accept: add to your stance"}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className={`rounded px-1.5 py-1 ${
                    stance === "rejected"
                      ? "bg-rose-600 text-white"
                      : "text-rose-600 hover:bg-rose-50"
                  }`}
                  title={stance === "rejected" ? "Rejected — click to clear" : "Reject: add to your stance"}
                >
                  ✗
                </button>
              </span>
            )}
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
            {!readOnly && (
              <>
                {!inert && (
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
                )}
                {onSetStatus && (
                  <span className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusMenu((v) => !v)}
                      className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="Lifecycle status (retract / refute / invalidate — the node stays as a ghost)"
                    >
                      ⋯
                    </button>
                    {statusMenu && (
                      <span className="absolute right-0 top-7 z-20 flex w-40 flex-col rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg">
                        {inert ? (
                          <button
                            type="button"
                            onClick={() => setStatus("active")}
                            className="px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            ↻ Reactivate
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setStatus("retracted")}
                              className="px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                              title="Withdraw it yourself — no verdict on truth"
                            >
                              Retract
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus("refuted")}
                              className="px-3 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50"
                              title="Judge it decisively defeated — close the book"
                            >
                              Mark refuted
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus("invalid")}
                              className="px-3 py-1.5 text-left text-xs text-orange-700 hover:bg-orange-50"
                              title="Malformed as a move (not wrong — not well-formed)"
                            >
                              Mark invalid
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded px-2 py-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete node and descendants (prefer status — delete destroys history)"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
