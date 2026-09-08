import { lazy, Suspense, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Link, useLocation, useParams } from "wouter";
import * as LZString from "lz-string";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Download,
  FileCode2,
  GitBranch,
  GitFork,
  HelpCircle,
  ListTree,
  Menu,
  Network,
  Plus,
  RefreshCw,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { useGraph } from "@/hooks/useGraph";
import { useProjects } from "@/hooks/useProjects";
import { readGraphFile } from "@/lib/io";
import * as G from "@/lib/graph";
import ArgumentView from "@/components/ArgumentView";
import TutorialOverlay from "@/components/TutorialOverlay";
import ExportModal from "@/components/ExportModal";

const GraphMap = lazy(() => import("@/components/GraphMap"));

export default function Home() {
  const params = useParams<{ projectId: string; branchId: string }>();
  const [, setLocation] = useLocation();
  const { getProject, getBranch, projects, createBranch } = useProjects();
  const projectId = params?.projectId || "starter";
  const branchId = params?.branchId || "examples";
  const project = getProject(projectId) || projects[0];
  const branch = getBranch(projectId, branchId) || project?.branches[0];
  const graphId = branch?.graphId || "default";

  const {
    graph,
    readOnly,
    loading,
    addRootQuestion,
    addNode,
    editNode,
    deleteNode,
    linkToExistingValue,
    verifySource,
    resetToSeed,
    importGraph,
  } = useGraph(graphId);

  const [view, setView] = useState<"outline" | "map">("map");
  const [showGuide, setShowGuide] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranchTitle, setNewBranchTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stats = useMemo(() => G.getGraphStats(graph), [graph]);
  const rootCount = G.getRootQuestions(graph).length;

  const showNotice = (message: string) => {
    setNotice(message);
    clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), 2600);
  };

  const createRoot = (content?: string) => {
    const trimmed = (content ?? draft).trim();
    if (!trimmed) return;
    addRootQuestion(trimmed);
    setDraft("");
    setCreatingRoot(false);
  };

  const copyShareLink = async () => {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(graph));
    const url = `${window.location.origin}${window.location.pathname}?view=${view}#tree=${compressed}`;
    try {
      await navigator.clipboard.writeText(url);
      showNotice("Share link copied to clipboard");
    } catch {
      showNotice("Could not copy the link");
    }
  };

  const handleBranchCreate = () => {
    const title = newBranchTitle.trim();
    if (!title || !project) return;
    const newB = createBranch(project.id, title);
    setCreatingBranch(false);
    setNewBranchTitle("");
    setShowBranchMenu(false);
    setLocation(`/editor/${project.id}/${newB.id}`);
    showNotice(`Switched to branch: ${title}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)] text-slate-900">
      {/* 2-ROW ARCHITECTURE HEADER */}
      <header className="z-40 shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        {/* ROW 1: BRAND & GLOBAL NAVIGATION (Height ~52px) */}
        <div className="flex h-13 items-center justify-between border-b border-slate-100 px-3 sm:px-5">
          {/* Left: Brand + Project & Branch Picker */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/">
              <a className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition" aria-label="Back to projects">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Link>
            <span className="h-5 w-px bg-slate-200" />
            
            <div className="relative">
              <button
                onClick={() => setShowBranchMenu((open) => !open)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-slate-100/80 transition"
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-950 text-white shrink-0">
                  <GitFork className="h-3 w-3" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-xs font-bold tracking-tight text-slate-900">{project?.name || "Reasoning Map"}</p>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <GitBranch className="h-2.5 w-2.5 text-indigo-600" /> {branch?.name || "Main map"}
                    <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                  </p>
                </div>
              </button>

              {showBranchMenu && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowBranchMenu(false)} aria-label="Close branch menu" />
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in zoom-in-95 duration-100">
                    <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Branches in {project?.name}</p>
                    <div className="mt-1 max-h-48 overflow-y-auto space-y-0.5">
                      {project?.branches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setShowBranchMenu(false);
                            setLocation(`/editor/${project.id}/${b.id}`);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                            b.id === branchId ? "bg-indigo-50 text-indigo-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <GitBranch className="h-3 w-3 text-slate-400" />
                            <span className="truncate">{b.name}</span>
                          </span>
                          {b.id === branchId && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {!readOnly && (
                      <div className="mt-2 border-t border-slate-100 pt-1.5">
                        {creatingBranch ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleBranchCreate();
                            }}
                            className="p-1"
                          >
                            <input
                              autoFocus
                              value={newBranchTitle}
                              onChange={(e) => setNewBranchTitle(e.target.value)}
                              placeholder="Branch name..."
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                            />
                            <div className="mt-1.5 flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setCreatingBranch(false)}
                                className="rounded px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!newBranchTitle.trim()}
                                className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-40"
                              >
                                Create
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => setCreatingBranch(true)}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50/70"
                          >
                            <Plus className="h-3.5 w-3.5" /> New Branch
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: Segmented View Control (Map vs Outline) */}
          <div className="flex rounded-xl bg-slate-100/90 p-1 shadow-inner">
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                view === "map" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Network className="h-3.5 w-3.5 text-indigo-600" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setView("outline")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                view === "outline" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListTree className="h-3.5 w-3.5 text-indigo-600" />
              <span>Outline</span>
            </button>
          </div>

          {/* Right: Global Utilities (Guide, Share, Menu) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuide(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
              title="How Axiomer works"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              onClick={() => void copyShareLink()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition"
              title="Copy shareable link"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu((open) => !open)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition"
                aria-label="Map actions"
              >
                <Menu className="h-4 w-4" />
              </button>

              {showMenu && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowMenu(false)} aria-label="Close menu" />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-xs shadow-xl animate-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setShowExport(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" /> Export (Markdown / JSON)
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" /> Import Graph
                      </button>
                    )}
                    <button
                      onClick={() => {
                        void copyShareLink();
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileCode2 className="h-3.5 w-3.5 text-slate-500" /> Copy Compressed URL
                    </button>
                    {!readOnly && <div className="my-1 border-t border-slate-100" />}
                    {!readOnly && (
                      <button
                        onClick={() => {
                          if (confirmReset) {
                            resetToSeed();
                            setShowMenu(false);
                            setConfirmReset(false);
                            showNotice("Reset to worked examples");
                          } else {
                            setConfirmReset(true);
                            clearTimeout(resetTimeoutRef.current);
                            resetTimeoutRef.current = setTimeout(() => setConfirmReset(false), 2500);
                          }
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                          confirmReset ? "bg-rose-50 font-bold text-rose-700" : "font-medium text-rose-600 hover:bg-rose-50"
                        }`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${confirmReset ? "text-rose-700" : "text-rose-500"}`} />
                        {confirmReset ? "Click again to reset" : "Load worked examples"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.md,.markdown,text/markdown,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  readGraphFile(file)
                    .then((next) => {
                      importGraph(next);
                      showNotice("Map imported successfully");
                    })
                    .catch((error: Error) => showNotice(error.message));
                }
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {/* ROW 2: CONTEXTUAL ACTION TOOLBAR (Height ~44px) */}
        <div className="flex h-11 items-center justify-between px-3 sm:px-5 text-xs">
          {/* Left: Contextual Actions */}
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={() => setCreatingRoot(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-slate-800 transition active:scale-[0.98]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Starting Thought</span>
              </button>
            )}
          </div>

          {/* Right: Grounding Status Indicators & Thought Count */}
          <div className="flex items-center gap-2 sm:gap-3">
            {graph.nodes.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50/80 px-2.5 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-200"
                  title="Claims grounded down to terminal values/facts"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{stats.groundedClaims} grounded</span>
                </span>

                {stats.openClaims > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50/80 px-2.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200"
                    title="Claims open/unresolved"
                  >
                    <CircleDashed className="h-3 w-3 text-amber-600" />
                    <span>{stats.openClaims} open</span>
                  </span>
                )}

                {stats.clashes > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-rose-50/80 px-2.5 py-0.5 font-semibold text-rose-800 ring-1 ring-rose-200"
                    title="Logical contradictions or conflicts"
                  >
                    <AlertCircle className="h-3 w-3 text-rose-600" />
                    <span>{stats.clashes} clash{stats.clashes > 1 ? "es" : ""}</span>
                  </span>
                )}
              </div>
            )}

            <span className="text-[11px] font-medium text-slate-400">
              {graph.nodes.length} thought{graph.nodes.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="min-h-0 flex-1">
        {readOnly && loading ? (
          <div className="grid h-[calc(100vh-6rem)] place-items-center text-sm text-slate-400">Loading map…</div>
        ) : view === "map" ? (
          <Suspense fallback={<div className="grid h-[calc(100vh-6rem)] place-items-center text-sm text-slate-400">Loading map…</div>}>
            <div className="h-[calc(100vh-6.1rem)]">
              <GraphMap
                graph={graph}
                onCreateRoot={readOnly ? undefined : addRootQuestion}
                onAddNode={readOnly ? undefined : addNode}
                onEditNode={readOnly ? undefined : editNode}
                onDeleteNode={readOnly ? undefined : deleteNode}
                onLinkValue={readOnly ? undefined : linkToExistingValue}
              />
            </div>
          </Suspense>
        ) : (
          <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-8 sm:pt-10">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Readable Outline</p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {project?.name || "Your Reasoning"}
                </h1>
                <p className="mt-1.5 text-xs text-slate-500">
                  Read from each initial claim or question down to its epistemic bedrock.
                </p>
              </div>
              {!readOnly && rootCount > 0 && (
                <button
                  onClick={() => setCreatingRoot(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Starting Thought
                </button>
              )}
            </div>

            {(creatingRoot || graph.nodes.length === 0) && !readOnly && (
              <form
                className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  createRoot();
                }}
              >
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  What do you want to explore?
                </label>
                <TextareaAutosize
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  minRows={2}
                  placeholder="Write a question, decision, or belief..."
                  className="mt-2.5 w-full resize-none bg-transparent text-lg font-semibold leading-7 tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={!draft.trim()}
                    className="rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-30 transition"
                  >
                    Add thought
                  </button>
                  {graph.nodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingRoot(false);
                        setDraft("");
                      }}
                      className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            <ArgumentView
              graph={graph}
              readOnly={readOnly}
              focusId={null}
              onSetFocus={() => {}}
              onAddNode={addNode}
              onLinkValue={linkToExistingValue}
              onEditNode={editNode}
              onDeleteNode={deleteNode}
              onVerifySource={verifySource}
            />
          </div>
        )}
      </main>

      {/* Floating Notifications Toast */}
      {notice && (
        <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="ml-1 text-slate-400 hover:text-white">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Overlays */}
      {showGuide && <TutorialOverlay onClose={() => setShowGuide(false)} />}
      {showExport && <ExportModal graph={graph} onClose={() => setShowExport(false)} />}
    </div>
  );
}

