// The Share tab: export/import, share-by-link, local drafts with diffs (the
// client-side analog of branches + draft PRs), and the guided GitHub flow for
// proposing changes to the canonical graph (docs/ARCHITECTURE.md).

import { useMemo, useRef, useState } from "react";
import type { Graph, GraphNode } from "@/lib/types";
import { downloadGraph, readGraphFile } from "@/lib/io";
import { buildShareUrl, SHARE_SOFT_LIMIT } from "@/lib/share";
import {
  deleteDraft,
  diffGraphs,
  listDrafts,
  saveDraft,
  summarizeDiff,
  type Draft,
  type GraphDiff,
} from "@/lib/versions";
import { NODE_META } from "@/lib/meta";

const REPO_URL =
  (import.meta.env.VITE_GITHUB_REPO as string | undefined) ??
  "https://github.com/disguide/Axiomer";
const CANONICAL_PATH = "client/public/graph.json";

interface SharePanelProps {
  graph: Graph;
  readOnly?: boolean;
  onReplaceGraph: (graph: Graph) => void;
}

function NodeLine({ node, sign }: { node: GraphNode; sign: "+" | "−" | "~" }) {
  const meta = NODE_META[node.type];
  const tone =
    sign === "+" ? "text-emerald-700" : sign === "−" ? "text-rose-700" : "text-amber-700";
  return (
    <li className="flex items-start gap-1.5 text-xs">
      <span className={`w-3 shrink-0 font-bold ${tone}`}>{sign}</span>
      <span className="shrink-0" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      <span className="min-w-0 truncate text-slate-600">{node.content}</span>
    </li>
  );
}

function DiffView({ diff }: { diff: GraphDiff }) {
  if (diff.identical)
    return <p className="text-xs text-slate-400">Identical to the current graph.</p>;
  return (
    <div className="space-y-1.5">
      <ul className="space-y-0.5">
        {diff.addedNodes.map((n) => (
          <NodeLine key={`a${n.id}`} node={n} sign="+" />
        ))}
        {diff.removedNodes.map((n) => (
          <NodeLine key={`r${n.id}`} node={n} sign="−" />
        ))}
        {diff.changedNodes.map((c) => (
          <li key={`c${c.after.id}`} className="flex items-start gap-1.5 text-xs">
            <span className="w-3 shrink-0 font-bold text-amber-700">~</span>
            <span className="shrink-0" style={{ color: NODE_META[c.after.type].color }}>
              {NODE_META[c.after.type].icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-slate-400 line-through">
                {c.before.content}
              </span>
              <span className="block truncate text-slate-700">{c.after.content}</span>
              <span className="text-[10px] text-slate-400">
                ({c.fields.join(", ")})
              </span>
            </span>
          </li>
        ))}
      </ul>
      {(diff.addedEdges.length > 0 || diff.removedEdges.length > 0) && (
        <p className="text-[11px] text-slate-400">
          links: +{diff.addedEdges.length} / −{diff.removedEdges.length}
        </p>
      )}
    </div>
  );
}

export default function SharePanel({
  graph,
  readOnly = false,
  onReplaceGraph,
}: SharePanelProps) {
  const [drafts, setDrafts] = useState<Draft[]>(() => listDrafts());
  const [draftName, setDraftName] = useState("");
  const [openDiff, setOpenDiff] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const shareUrl = useMemo(
    () => buildShareUrl(graph, window.location.href),
    [graph],
  );

  const copyLink = async (url: string, what: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`${what} copied to clipboard (${url.length.toLocaleString()} chars)`);
    } catch {
      setNotice("Could not access the clipboard — long-press / right-click the button to copy its link.");
    }
    setTimeout(() => setNotice(null), 4000);
  };

  const importFile = async (file: File, mode: "replace" | "draft") => {
    setImportError(null);
    try {
      const imported = await readGraphFile(file);
      if (mode === "replace") {
        if (
          window.confirm(
            `Replace your current graph (${graph.nodes.length} nodes) with "${file.name}" (${imported.nodes.length} nodes)? Tip: save a draft first if unsure.`,
          )
        ) {
          onReplaceGraph(imported);
          setNotice("Imported — the graph has been replaced.");
        }
      } else {
        setDrafts(saveDraft(`Imported: ${file.name}`, imported));
        setNotice("Imported as a draft — review its diff below, restore when ready.");
      }
    } catch (err) {
      setImportError(`Import rejected: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-700">
          {notice}
        </p>
      )}

      {/* Share & export */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Share &amp; export</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          The whole graph travels as a file or a link — anyone can open it,
          modify their copy, and send it back. No account, no server.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadGraph(graph)}
            className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            title="Download graph.json — the same file the canonical repo stores"
          >
            ⤓ Export graph.json
          </button>
          <button
            type="button"
            onClick={() => copyLink(shareUrl, "Share link")}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            title="Copies a URL that contains the entire graph, compressed"
          >
            🔗 Copy share link
          </button>
        </div>
        {shareUrl.length > SHARE_SOFT_LIMIT && (
          <p className="mt-2 text-[11px] text-amber-600">
            ⚠ This graph makes a {Math.round(shareUrl.length / 1000)}k-character
            link — some chat apps truncate long URLs. Prefer the file export.
          </p>
        )}
      </div>

      {/* Import */}
      {!readOnly && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Import</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Open a graph.json someone sent you (or your own export). Strictly
            validated — malformed files are rejected, never half-loaded.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file, "draft");
              e.target.value = "";
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              title="Safest: lands as a draft you can diff before restoring"
            >
              ⤒ Import as draft
            </button>
            <label className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
              Import &amp; replace…
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importFile(file, "replace");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importError && (
            <p className="mt-2 rounded bg-rose-50 p-2 text-[11px] text-rose-600">
              {importError}
            </p>
          )}
        </div>
      )}

      {/* Drafts & versions */}
      {!readOnly && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Drafts &amp; versions
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Snapshot before an experiment, keep several lines of thought, diff
            any draft against the current graph, restore when ready — branches
            and draft PRs, kept local.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-slate-300 p-1.5 text-xs"
              placeholder={`Draft name (e.g. "before utilitarian rework")`}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setDrafts(saveDraft(draftName, graph));
                  setDraftName("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setDrafts(saveDraft(draftName, graph));
                setDraftName("");
              }}
              className="shrink-0 rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              + Save current as draft
            </button>
          </div>

          {drafts.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No drafts yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {drafts.map((draft) => {
                const diff = diffGraphs(graph, draft.graph);
                return (
                  <li
                    key={draft.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-800">
                        {draft.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(draft.savedAt).toLocaleString()} ·{" "}
                        {draft.graph.nodes.length} nodes ·{" "}
                        {diff.identical ? "same as current" : `restoring would apply: ${summarizeDiff(diff)}`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDiff(openDiff === draft.id ? null : draft.id)
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        {openDiff === draft.id ? "Hide diff" : "View diff"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            diff.identical ||
                            window.confirm(
                              `Restore "${draft.name}"? Your current graph will be replaced (${summarizeDiff(diff)}). Save a draft of the current state first if unsure.`,
                            )
                          ) {
                            onReplaceGraph(draft.graph);
                            setNotice(`Restored draft "${draft.name}".`);
                          }
                        }}
                        className="rounded bg-slate-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
                      >
                        ⤺ Restore
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyLink(
                            buildShareUrl(draft.graph, window.location.href),
                            `Share link for "${draft.name}"`,
                          )
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        🔗 Share
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadGraph(
                            draft.graph,
                            `${draft.name.replace(/[^\w-]+/g, "-").toLowerCase() || "draft"}.graph.json`,
                          )
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        ⤓ Export
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete draft "${draft.name}"?`))
                            setDrafts(deleteDraft(draft.id));
                        }}
                        className="ml-auto rounded px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                    {openDiff === draft.id && (
                      <div className="mt-2 rounded bg-white p-2 ring-1 ring-slate-200">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Restoring this draft would change:
                        </p>
                        <DiffView diff={diff} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* GitHub */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Propose to the shared graph (GitHub)
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          The canonical graph lives in Git —{" "}
          <code className="rounded bg-slate-100 px-1">{CANONICAL_PATH}</code> in{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-slate-700 underline"
          >
            the repository
          </a>
          . Changes land through reviewed pull requests, and every merge
          republishes the public read-only viewer. History, attribution, revert
          and review — GitHub provides all of it.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
          <li>
            <button
              type="button"
              onClick={() => downloadGraph(graph)}
              className="text-slate-800 underline hover:text-slate-600"
            >
              Export your graph.json
            </button>{" "}
            (your local work, validated).
          </li>
          <li>
            <a
              href={`${REPO_URL}/edit/main/${CANONICAL_PATH}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 underline hover:text-slate-600"
            >
              Open the canonical file on GitHub
            </a>{" "}
            — GitHub forks the repo for you if you don't have write access.
          </li>
          <li>Paste your exported JSON over the file's contents.</li>
          <li>
            Choose <em>“Create a new branch … and start a pull request”</em> —
            open it as a <strong>draft PR</strong> while you polish, mark it
            ready when done.
          </li>
          <li>
            A maintainer reviews the diff; on merge, CI redeploys the public
            viewer with your changes.
          </li>
        </ol>
        <p className="mt-2 text-[11px] text-slate-400">
          Tip: keep proposals small and reviewable — one question deepened, one
          duplicate merged — exactly like code.
        </p>
      </div>
    </div>
  );
}
