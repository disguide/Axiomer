import { lazy, Suspense, useState, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useGraph } from "@/hooks/useGraph";
import { readGraphFile } from "@/lib/io";
import ArgumentView from "@/components/ArgumentView";
import TutorialOverlay from "@/components/TutorialOverlay";
import ExportModal from "@/components/ExportModal";
import * as LZString from "lz-string";
import { useParams, Link } from "wouter";
import { useProjects } from "@/hooks/useProjects";
import { Menu, HelpCircle, Network, ListTree, FolderGit2, GitBranch } from "lucide-react";

const GraphMap = lazy(() => import("@/components/GraphMap"));

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
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"tree" | "map">("tree");
  const [showGuide, setShowGuide] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const submitCreate = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addRootQuestion(trimmed);
    setDraft("");
    setCreating(false);
  };

  const handleShareLink = () => {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(graph));
    const url = `${window.location.origin}${window.location.pathname}?view=${view}#tree=${compressed}`;
    navigator.clipboard.writeText(url)
      .then(() => alert("Share link copied!"))
      .catch((err) => alert("Failed: " + err));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Floating Glassmorphic Header */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-5xl rounded-2xl border border-white/40 bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="flex w-full items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            {params?.projectId ? (
              <>
                <Link href="/">
                  <a className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium bg-slate-100 hover:bg-indigo-50 px-2 py-1 rounded-md">
                    ← Dashboard
                  </a>
                </Link>
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <FolderGit2 className="w-4 h-4 text-indigo-500" />
                  {project?.name}
                  <span className="text-slate-300 mx-1">/</span>
                  <GitBranch className="w-4 h-4 text-emerald-500" />
                  {branch?.name}
                </div>
              </>
            ) : (
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Axiomer</h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex rounded-lg bg-slate-100/80 p-1 border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setView("tree")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${view === "tree" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
              >
                <ListTree className="w-3.5 h-3.5" /> Tree
              </button>
              <button
                onClick={() => setView("map")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${view === "map" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
              >
                <Network className="w-3.5 h-3.5" /> Map
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200"></div>

            <div className="flex items-center gap-1">
              <button onClick={() => setShowGuide(true)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="Help guide">
                <HelpCircle className="w-4 h-4" />
              </button>

            {/* Overflow menu for import/export/share/reset */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                <Menu className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-sm">
                    <button onClick={() => { setShowExport(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700">Export / Copy...</button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700">Import JSON</button>
                    <button onClick={() => { handleShareLink(); setShowMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700">Copy share link</button>
                    <hr className="my-1 border-slate-100" />
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if (confirmReset) { 
                          resetToSeed(); 
                          setShowMenu(false);
                          setConfirmReset(false);
                          clearTimeout(resetTimeoutRef.current);
                        } else {
                          setConfirmReset(true);
                          resetTimeoutRef.current = setTimeout(() => setConfirmReset(false), 2500);
                        }
                      }} 
                      className={`w-full text-left px-3 py-2 transition-colors ${confirmReset ? 'bg-rose-50 text-rose-700 font-bold' : 'hover:bg-slate-50 text-rose-600'}`}
                    >
                      {confirmReset ? 'Click again to reset' : 'Reset to examples'}
                    </button>
                  </div>
                </>
              )}
            </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) readGraphFile(f).then(importGraph).catch((err) => alert(err.message)); e.target.value = ""; }} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`mx-auto ${view === 'map' ? 'w-full h-screen' : 'max-w-3xl px-6 pt-36 pb-32'}`}>
        {readOnly && loading ? (
          <p className="text-center text-sm text-slate-400 py-12">Loading…</p>
        ) : view === "map" ? (
          <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400 text-sm bg-slate-50">Loading map…</div>}>
            <div className="w-full h-full">
              <GraphMap graph={graph} onNodeMove={readOnly ? undefined : moveNode} onConnectEdges={readOnly ? undefined : addEdge} onAddNode={readOnly ? undefined : (type, content, pos) => addFloatingNode(type, content, pos as {x: number, y: number})} onEditNode={readOnly ? undefined : editNode} />
            </div>
          </Suspense>
        ) : (
          <div className="space-y-4">
            {/* New claim input */}
            {!readOnly && (
              creating ? (
                <div className="flex flex-col mb-12 mt-8 animate-in fade-in duration-300">
                  <TextareaAutosize
                    autoFocus
                    className={`w-full font-bold bg-transparent border-none placeholder-slate-200 text-slate-800 focus:outline-none focus:ring-0 px-0 mb-6 tracking-tight resize-none leading-tight ${graph.nodes.length === 0 ? 'text-5xl' : 'text-3xl'}`}
                    placeholder={graph.nodes.length === 0 ? "Untitled Argument" : "Add another argument..."}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { 
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitCreate(); } 
                      if (e.key === "Escape") { setCreating(false); setDraft(""); } 
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={submitCreate} className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm">Save</button>
                    <button onClick={() => { setCreating(false); setDraft(""); }} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className={`w-full text-left font-bold text-slate-200 hover:text-slate-400 transition-colors bg-transparent border-none px-0 mb-12 mt-8 tracking-tight leading-tight ${graph.nodes.length === 0 ? 'text-5xl' : 'text-3xl'}`}
                >
                  {graph.nodes.length === 0 ? "Untitled Argument" : "Add another argument..."}
                </button>
              )
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

      {showGuide && <TutorialOverlay onClose={() => setShowGuide(false)} />}
      {showExport && <ExportModal graph={graph} onClose={() => setShowExport(false)} />}
    </div>
  );
}
