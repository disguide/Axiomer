import { lazy, Suspense, useState, useRef } from "react";
import { useGraph } from "@/hooks/useGraph";
import { downloadGraph, readGraphFile } from "@/lib/io";
import ArgumentView from "@/components/ArgumentView";
import ValuesIndex from "@/components/ValuesIndex";
import { StatusWindow } from "@/components/StatusWindow";
import { Bibliography } from "@/components/Bibliography";
import DepthPanel from "@/components/DepthPanel";
import Legend from "@/components/Legend";
import TutorialOverlay from "@/components/TutorialOverlay";
import ArgumentToolbar from "@/components/ArgumentToolbar";
import * as LZString from "lz-string";
import { useParams, Link } from "wouter";
import { useProjects } from "@/hooks/useProjects";

// React Flow is heavy and only used by the Map tab — load it on demand.
const GraphMap = lazy(() => import("@/components/GraphMap"));

const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;

export default function Home() {
  const params = useParams<{ projectId: string; branchId: string }>();
  const { getProject, getBranch } = useProjects();
  
  const projectId = params?.projectId || "default";
  const branchId = params?.branchId || "default";
  
  const project = getProject(projectId);
  const branch = getBranch(projectId, branchId);
  const graphId = branch?.graphId || "default";

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
    verifySource,
    resetToSeed,
    importGraph,
    moveNode,
    addEdge,
    addFloatingNode,
  } = useGraph(graphId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creating, setCreating] = useState<null | "claim" | "premise">(null);
  const [draft, setDraft] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [view, setView] = useState<"argument" | "map">("argument");
  const [overlay, setOverlay] = useState<"values" | "status" | "sources" | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const focusInTree = (nodeId: string) => {
    setView("argument");
    setFocusId(nodeId);
  };

  const startCreating = (kind: "claim" | "premise") => {
    setView("argument");
    setDraft("");
    setCreating(kind);
  };

  const cancelCreating = () => {
    setDraft("");
    setCreating(null);
  };

  const submitCreate = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (creating === "premise") addRootPremise(trimmed);
    else addRootQuestion(trimmed);
    cancelCreating();
  };

  const handleShareLink = () => {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(graph));
    const url = `${window.location.origin}${window.location.pathname}?view=${view}#tree=${compressed}`;
    navigator.clipboard.writeText(url)
      .then(() => alert("Share link copied to clipboard!"))
      .catch((err) => alert("Failed to copy link: " + err));
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {params?.projectId && (
              <Link href="/">
                <a className="text-slate-400 hover:text-slate-700 transition-colors mr-2 text-sm font-medium">
                  &larr; Back
                </a>
              </Link>
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {project && branch ? `${project.name} / ${branch.name}` : "Axiomer Workspace"}
              </h1>
              <p className="text-xs text-slate-500">
                Trace questions down to bedrock values.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              ? Guide
            </button>
            <button
              type="button"
              onClick={() => setShowLegend((v) => !v)}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              {showLegend ? "Hide legend" : "Legend"}
            </button>
            {readOnly ? (
              DONATE_URL && (
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  ♥ Donate
                </a>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => downloadGraph(graph)}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  title="Export the graph as graph.json (for a pull request)"
                >
                  ⤓ Export
                </button>
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  title="Copy a shareable link to this exact graph"
                >
                  🔗 Share Link
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    readGraphFile(file)
                      .then((loaded) => importGraph(loaded))
                      .catch((err) => alert(`Failed to import: ${err.message}`));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  title="Import a graph.json file"
                >
                  ⤒ Import
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-slate-200/50 py-2 px-4">
          <div className="inline-flex rounded-lg bg-slate-200/50 p-1 text-sm shadow-inner">
            <button
              type="button"
              onClick={() => setView("argument")}
              className={`rounded px-4 py-1 font-medium transition-colors ${
                view === "argument"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              Document View
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={`rounded px-4 py-1 font-medium transition-colors ${
                view === "map"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              Whiteboard View
            </button>
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
        <section className={view === "argument" ? "relative" : ""}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
            <div className="inline-flex rounded-md text-sm gap-2">
              <button
                type="button"
                onClick={() => setOverlay("sources")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  overlay === "sources"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                Sources
              </button>
              <button
                type="button"
                onClick={() => setOverlay("values")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  overlay === "values"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                Values
              </button>
              <button
                type="button"
                onClick={() => setOverlay("status")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  overlay === "status"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                Status
              </button>
            </div>
          </div>

          {readOnly && loading ? (
            <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
          ) : view === "map" ? (
          <Suspense fallback={
            <div className="flex h-[78vh] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500"></span>
                <span className="text-sm font-medium">Loading Map...</span>
              </div>
            </div>
          }>
            <GraphMap 
              graph={graph} 
              onNodeMove={readOnly ? undefined : moveNode}
              onConnectEdges={readOnly ? undefined : addEdge}
              onAddNode={readOnly ? undefined : addFloatingNode}
              onEditNode={readOnly ? undefined : editNode}
            />
          </Suspense>
          ) : (
            <>
              {!readOnly && (
                <ArgumentToolbar
                  onAddClaim={() => startCreating("claim")}
                  onAddPremise={() => startCreating("premise")}
                />
              )}
          {!focusId && <DepthPanel graph={graph} onFocus={focusInTree} />}
          {creating && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-all animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold tracking-wider text-slate-500 uppercase mb-3">
                {creating === "premise"
                  ? "Build from a new Premise"
                  : "Explore a new Claim"}
              </label>
              <textarea
                className="w-full resize-none overflow-hidden rounded-lg bg-slate-50 border border-slate-200 p-4 text-lg text-slate-900 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400 focus:outline-none"
                rows={1}
                autoFocus
                placeholder={
                  creating === "premise"
                    ? "e.g., All humans have equal moral worth"
                    : "e.g., Should you pull the lever?"
                }
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "inherit";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    submitCreate();
                  if (e.key === "Escape") cancelCreating();
                }}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-500">Cmd</kbd> + <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-500">Enter</kbd> to submit
                </span>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelCreating}
                    className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitCreate}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    {creating === "premise" ? "Create Premise" : "Create Claim"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ArgumentView
            graph={graph}
            readOnly={readOnly}
            focusId={focusId}
            onSetFocus={setFocusId}
            onAddNode={addNode}
            onLinkValue={linkToExistingValue}
            onEditNode={editNode}
            onDeleteNode={deleteNode}
            onVerifySource={verifySource}
          />
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

      {/* Full-screen Overlay for Secondary Views */}
      {overlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 capitalize">{overlay === 'status' ? 'Philosophical Profile' : overlay}</h2>
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto relative bg-slate-50">
              {overlay === "values" && <ValuesIndex graph={graph} />}
              {overlay === "status" && <StatusWindow graph={graph} />}
              {overlay === "sources" && <Bibliography graph={graph} onVerifySource={verifySource} readOnly={readOnly} />}
            </div>
          </div>
        </div>
      )}

      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
