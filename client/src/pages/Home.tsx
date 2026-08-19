import { lazy, Suspense, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Link, useParams } from "wouter";
import * as LZString from "lz-string";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  GitFork,
  HelpCircle,
  ListTree,
  Menu,
  Network,
  Plus,
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
  const { getProject, getBranch } = useProjects();
  const projectId = params?.projectId || "starter";
  const branchId = params?.branchId || "examples";
  const project = getProject(projectId);
  const branch = getBranch(projectId, branchId);
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
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [creatingRoot, setCreatingRoot] = useState(false);
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
      showNotice("Share link copied");
    } catch {
      showNotice("Could not copy the link");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)] text-slate-900">
      <header className="z-40 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/">
            <a className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Back to maps"><ArrowLeft className="h-4 w-4" /></a>
          </Link>
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white sm:grid"><GitFork className="h-3.5 w-3.5" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{project?.name || "Reasoning map"}</p>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">{branch?.name || "Main map"} · {graph.nodes.length} thoughts</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {graph.nodes.length > 0 && (
            <div className="mr-1 hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {stats.groundedClaims} grounded</span>
              {stats.openClaims > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200"><CircleDashed className="h-3.5 w-3.5 text-amber-500" /> {stats.openClaims} open</span>}
            </div>
          )}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => setView("map")} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${view === "map" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Network className="h-3.5 w-3.5" /><span className="hidden sm:inline">Map</span></button>
            <button onClick={() => setView("outline")} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${view === "outline" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><ListTree className="h-3.5 w-3.5" /><span className="hidden sm:inline">Outline</span></button>
          </div>
          <button onClick={() => setShowGuide(true)} className="hidden h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:grid" aria-label="How Axiomer works"><HelpCircle className="h-4 w-4" /></button>
          <div className="relative">
            <button onClick={() => setShowMenu((open) => !open)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Map menu"><Menu className="h-4 w-4" /></button>
            {showMenu && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowMenu(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl">
                  <button onClick={() => { setShowGuide(true); setShowMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50 sm:hidden">How it works</button>
                  <button onClick={() => { setShowExport(true); setShowMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50">Export or copy JSON</button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50">Import JSON</button>
                  <button onClick={() => { void copyShareLink(); setShowMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50">Copy share link</button>
                  {!readOnly && <div className="my-1 border-t border-slate-100" />}
                  {!readOnly && <button onClick={() => { if (confirmReset) { resetToSeed(); setShowMenu(false); setConfirmReset(false); } else { setConfirmReset(true); clearTimeout(resetTimeoutRef.current); resetTimeoutRef.current = setTimeout(() => setConfirmReset(false), 2500); } }} className={`w-full rounded-lg px-3 py-2 text-left ${confirmReset ? "bg-rose-50 font-semibold text-rose-700" : "text-rose-600 hover:bg-rose-50"}`}>{confirmReset ? "Click again to load examples" : "Replace with examples"}</button>}
                </div>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(event) => { const file = event.target.files?.[0]; if (file) readGraphFile(file).then((next) => { importGraph(next); showNotice("Map imported"); }).catch((error: Error) => showNotice(error.message)); event.target.value = ""; }} />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {readOnly && loading ? (
          <div className="grid h-[calc(100vh-4rem)] place-items-center text-sm text-slate-400">Loading map…</div>
        ) : view === "map" ? (
          <Suspense fallback={<div className="grid h-[calc(100vh-4rem)] place-items-center text-sm text-slate-400">Loading map…</div>}>
            <div className="h-[calc(100vh-4rem)]">
              <GraphMap graph={graph} onCreateRoot={readOnly ? undefined : addRootQuestion} onAddNode={readOnly ? undefined : addNode} onEditNode={readOnly ? undefined : editNode} onDeleteNode={readOnly ? undefined : deleteNode} onLinkValue={readOnly ? undefined : linkToExistingValue} />
            </div>
          </Suspense>
        ) : (
          <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-8 sm:pt-14">
            <div className="mb-10 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Readable outline</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{project?.name || "Your reasoning"}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Read from each starting thought down to the foundations beneath it.</p>
              </div>
              {!readOnly && rootCount > 0 && <button onClick={() => setCreatingRoot(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"><Plus className="h-4 w-4" /> New starting thought</button>}
            </div>

            {(creatingRoot || graph.nodes.length === 0) && !readOnly && (
              <form className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => { event.preventDefault(); createRoot(); }}>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What do you want to explore?</label>
                <TextareaAutosize autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} minRows={2} placeholder="Write a question, decision, or belief…" className="mt-3 w-full resize-none bg-transparent text-xl font-semibold leading-8 tracking-tight text-slate-900 outline-none placeholder:text-slate-300" />
                <div className="mt-4 flex gap-2"><button disabled={!draft.trim()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">Add thought</button>{graph.nodes.length > 0 && <button type="button" onClick={() => { setCreatingRoot(false); setDraft(""); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>}</div>
              </form>
            )}

            <ArgumentView graph={graph} readOnly={readOnly} focusId={null} onSetFocus={() => {}} onAddNode={addNode} onLinkValue={linkToExistingValue} onEditNode={editNode} onDeleteNode={deleteNode} onVerifySource={verifySource} />
          </div>
        )}
      </main>

      {notice && <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-xl"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{notice}<button onClick={() => setNotice(null)} className="ml-1 text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button></div>}
      {showGuide && <TutorialOverlay onClose={() => setShowGuide(false)} />}
      {showExport && <ExportModal graph={graph} onClose={() => setShowExport(false)} />}
    </div>
  );
}
