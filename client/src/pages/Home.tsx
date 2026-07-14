import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/types";
import { useGraph } from "@/hooks/useGraph";
import { useStance } from "@/hooks/useStance";
import { downloadGraph } from "@/lib/io";
import { parseShareHash } from "@/lib/share";
import { saveDraft } from "@/lib/versions";
import TreeView from "@/components/TreeView";
import TreesGallery from "@/components/TreesGallery";
import ValuesIndex from "@/components/ValuesIndex";
import StancePanel from "@/components/StancePanel";
import OrganizePanel from "@/components/OrganizePanel";
import AgentsPanel from "@/components/AgentsPanel";
import SharePanel from "@/components/SharePanel";
import DepthPanel from "@/components/DepthPanel";
import Legend from "@/components/Legend";

// React Flow is heavy and only used by the Map/Canvas tabs — load on demand.
const GraphMap = lazy(() => import("@/components/GraphMap"));
const CanvasBoard = lazy(() => import("@/components/CanvasBoard"));

const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;

export default function Home() {
  const {
    graph,
    readOnly,
    loading,
    addRootQuestion,
    addRootPremise,
    addNode,
    editNode,
    deleteNode,
    linkToExistingValue,
    setNodeStatus,
    setProofStandard,
    mergeTerminals,
    relabelNode,
    addBox,
    moveNode,
    connectNodes,
    deleteEdge,
    removeBox,
    applyProposalOp,
    replaceGraph,
    resetToSeed,
  } = useGraph();
  // Personal commitment store — works in the read-only viewer too.
  const { stance, accept, reject, clear: clearStance } = useStance();

  const [creating, setCreating] = useState<null | "question" | "premise">(null);
  const [draft, setDraft] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  // The Map is the primary surface (and what the public read-only viewer leads with).
  const [view, setView] = useState<
    "canvas" | "tree" | "values" | "map" | "stance" | "organize" | "agents" | "share"
  >("map");
  const [focusId, setFocusId] = useState<string | null>(null);

  // Incoming share link (#g=…): decode once, offer to import — never clobber.
  const [incomingShare, setIncomingShare] = useState<Graph | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  useEffect(() => {
    if (!window.location.hash.startsWith("#g=")) return;
    try {
      const shared = parseShareHash(window.location.hash);
      if (shared) setIncomingShare(shared);
    } catch (err) {
      setShareError(`Shared link could not be opened: ${(err as Error).message}`);
    }
    // Clear the hash either way so reloads don't re-prompt.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const focusInTree = (nodeId: string) => {
    setView("tree");
    setFocusId(nodeId);
  };

  const startCreating = (kind: "question" | "premise") => {
    setView("tree");
    setDraft("");
    setCreating(kind);
  };

  const cancelCreating = () => {
    setDraft("");
    setCreating(null);
  };

  // After creating a root, drop straight onto its blank canvas.
  const pendingFocusRoot = useRef(false);
  useEffect(() => {
    if (!pendingFocusRoot.current) return;
    pendingFocusRoot.current = false;
    const last = graph.nodes[graph.nodes.length - 1];
    if (last) setFocusId(last.id);
  }, [graph]);

  const submitCreate = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    pendingFocusRoot.current = true;
    if (creating === "premise") addRootPremise(trimmed);
    else addRootQuestion(trimmed);
    cancelCreating();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Axiomer</h1>
            <p className="text-xs text-slate-500">
              Trace questions down to bedrock values — or build up from a
              premise.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {showLegend ? "Hide legend" : "Legend"}
            </button>
            {readOnly ? (
              DONATE_URL && (
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  ♥ Donate
                </a>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => downloadGraph(graph)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  title="Export the graph as graph.json (for a pull request)"
                >
                  ⤓ Export
                </button>
                <button
                  type="button"
                  onClick={() => startCreating("premise")}
                  className="rounded border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                >
                  🌱 New Premise
                </button>
                <button
                  type="button"
                  onClick={() => startCreating("question")}
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  + New Question
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={
          view === "map"
            ? "mx-auto max-w-[96rem] px-4 py-6"
            : "mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_18rem]"
        }
      >
        <section>
          <div className="mb-4 inline-flex flex-wrap rounded-md border border-slate-200 bg-white p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setView("canvas")}
              className={`rounded px-3 py-1 ${
                view === "canvas"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Freeform board — dump boxes, draw arrows, then let AI organize"
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setView("tree")}
              className={`rounded px-3 py-1 ${
                view === "tree"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tree
            </button>
            <button
              type="button"
              onClick={() => setView("values")}
              className={`rounded px-3 py-1 ${
                view === "values"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Values
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={`rounded px-3 py-1 ${
                view === "map"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setView("stance")}
              className={`rounded px-3 py-1 ${
                view === "stance"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Your commitments: what you accept, what it entails, where it collides"
            >
              Stance
              {stance.accepted.length + stance.rejected.length > 0 && (
                <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">
                  {stance.accepted.length + stance.rejected.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setView("organize")}
              className={`rounded px-3 py-1 ${
                view === "organize"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="The graph's structural to-do list: duplicates, unanswered attacks, ungrounded chains"
            >
              Organize
            </button>
            <button
              type="button"
              onClick={() => setView("agents")}
              className={`rounded px-3 py-1 ${
                view === "agents"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Plug in your own AI (any key, any provider) to propose changes you review"
            >
              ✨ Agents
            </button>
            <button
              type="button"
              onClick={() => setView("share")}
              className={`rounded px-3 py-1 ${
                view === "share"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Export/import, share links, drafts & diffs, propose on GitHub"
            >
              Share
            </button>
          </div>

          {shareError && (
            <p className="mb-3 rounded-md bg-rose-50 p-2 text-xs text-rose-600">
              {shareError}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setShareError(null)}
              >
                dismiss
              </button>
            </p>
          )}
          {incomingShare && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-medium text-indigo-800">
                🔗 Someone shared a graph with you: {incomingShare.nodes.length}{" "}
                nodes, {incomingShare.edges.length} links.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        saveDraft("Received via share link", incomingShare);
                        setIncomingShare(null);
                        setView("share");
                      }}
                      className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500"
                      title="Safest: lands as a draft you can diff before restoring"
                    >
                      Save as draft
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Replace your current graph (${graph.nodes.length} nodes) with the shared one (${incomingShare.nodes.length} nodes)?`,
                          )
                        ) {
                          replaceGraph(incomingShare);
                          setIncomingShare(null);
                        }
                      }}
                      className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Replace current
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIncomingShare(null)}
                  className="rounded px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {readOnly && loading ? (
            <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
          ) : view === "canvas" ? (
            <Suspense
              fallback={
                <p className="p-8 text-center text-sm text-slate-400">
                  Loading canvas…
                </p>
              }
            >
              <CanvasBoard
                graph={graph}
                readOnly={readOnly}
                onAddBox={addBox}
                onMoveNode={moveNode}
                onConnect={connectNodes}
                onEditNode={editNode}
                onRemoveBox={removeBox}
                onDeleteEdge={deleteEdge}
                onApplyOp={applyProposalOp}
                onOpenAgents={() => setView("agents")}
              />
            </Suspense>
          ) : view === "values" ? (
            <ValuesIndex graph={graph} onOpenTree={focusInTree} />
          ) : view === "stance" ? (
            <StancePanel
              graph={graph}
              stance={stance}
              onAccept={accept}
              onReject={reject}
              onClear={clearStance}
              onFocus={focusInTree}
            />
          ) : view === "organize" ? (
            <OrganizePanel
              graph={graph}
              readOnly={readOnly}
              onFocus={focusInTree}
              onMerge={mergeTerminals}
              onRetract={(id) => setNodeStatus(id, "retracted")}
            />
          ) : view === "agents" ? (
            <AgentsPanel
              graph={graph}
              readOnly={readOnly}
              onApplyOp={applyProposalOp}
            />
          ) : view === "share" ? (
            <SharePanel
              graph={graph}
              readOnly={readOnly}
              onReplaceGraph={replaceGraph}
            />
          ) : view === "map" ? (
            <Suspense
              fallback={
                <p className="p-8 text-center text-sm text-slate-400">
                  Loading map…
                </p>
              }
            >
              <GraphMap graph={graph} />
            </Suspense>
          ) : (
            <>
          {!focusId && <DepthPanel graph={graph} onFocus={focusInTree} />}
          {creating && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium text-slate-700">
                {creating === "premise"
                  ? "What premise do you want to build from?"
                  : "What question do you want to explore?"}
              </label>
              <textarea
                className="mt-1 w-full resize-y rounded border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
                rows={2}
                autoFocus
                placeholder={
                  creating === "premise"
                    ? "All humans have equal moral worth"
                    : "Should you pull the lever?"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    submitCreate();
                  if (e.key === "Escape") cancelCreating();
                }}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelCreating}
                  className="rounded px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreate}
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
                >
                  {creating === "premise" ? "Create Premise" : "Create Question"}
                </button>
              </div>
            </div>
          )}

          {focusId ? (
            <TreeView
              graph={graph}
              readOnly={readOnly}
              focusId={focusId}
              stance={stance}
              onSetFocus={setFocusId}
              onAddNode={addNode}
              onLinkValue={linkToExistingValue}
              onEditNode={editNode}
              onDeleteNode={deleteNode}
              onSetStatus={setNodeStatus}
              onSetProofStandard={setProofStandard}
              onAccept={accept}
              onReject={reject}
              onRelabelNode={relabelNode}
            />
          ) : (
            <TreesGallery
              graph={graph}
              readOnly={readOnly}
              onOpen={setFocusId}
              onNew={startCreating}
              onOpenValues={() => setView("values")}
            />
          )}
            </>
          )}

          {!readOnly && (
            <div className="mt-8 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset the graph to the seed examples? This discards your current graph.",
                    )
                  )
                    resetToSeed();
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Reset to seed examples
              </button>
            </div>
          )}

          {readOnly && DONATE_URL && (
            <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              A free, community-built argument wiki.{" "}
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-rose-500 hover:underline"
              >
                Support it with a donation
              </a>
              .
            </footer>
          )}
        </section>

        {view !== "map" && (
          <aside className={`${showLegend ? "block" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-6">
              <Legend />
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
