import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/hooks/useProjects";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FolderGit2,
  GitBranch,
  GitFork,
  Layers3,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export default function Dashboard() {
  const { projects, createProject, deleteProject, createBranch } = useProjects();
  const [, setLocation] = useLocation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingBranchForProject, setCreatingBranchForProject] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (creatingBranchForProject) branchInputRef.current?.focus();
  }, [creatingBranchForProject]);

  const handleCreateProject = (customTitle?: string) => {
    const title = (customTitle ?? name).trim();
    if (!title) return;
    const project = createProject(title);
    const branch = project.branches[0];
    setCreating(false);
    setName("");
    setLocation(`/editor/${project.id}/${branch.id}`);
  };

  const handleCreateBranch = (projectId: string) => {
    const title = branchName.trim();
    if (!title) return;
    const branch = createBranch(projectId, title);
    setCreatingBranchForProject(null);
    setBranchName("");
    setLocation(`/editor/${projectId}/${branch.id}`);
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.branches.some((b) => b.name.toLowerCase().includes(q))
    );
  });

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8 sm:pt-8">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <a href="/" className="flex items-center gap-3" aria-label="Axiomer home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-950/10">
              <GitFork className="h-5 w-5" />
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-950">Axiomer</span>
              <span className="hidden text-xs text-slate-400 sm:inline ml-2 font-medium">Coherence Engine</span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Local-first & Private
            </span>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="grid items-end gap-10 pb-12 pt-14 lg:grid-cols-[1.25fr_.75fr] lg:pt-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-900 shadow-sm">
              <Compass className="h-3.5 w-3.5 text-indigo-600" /> Epistemic Reasoning & Derivation
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
              See what your beliefs are built on.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Start with a question, position, or belief. Trace support, conflict, and context until every path bottoms out at a fundamental value, empirical source, bedrock fact, or honest limit.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Start a new map
              </button>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-400">Quick templates:</span>
                {[
                  "AI Safety Alignment",
                  "Architectural Monolith vs Microservices",
                  "Scientific Reproducibility",
                ].map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => handleCreateProject(tmpl)}
                    className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-white hover:text-indigo-600 transition"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">The 3-Step Method</p>
            <ol className="mt-4 space-y-4">
              {[
                ["1", "State it", "Write the claim, decision, or question plainly."],
                ["2", "Trace it", "Add support, conflict, evidence, and context."],
                ["3", "Ground it", "End each path at the terminal foundation you accept."],
              ].map(([number, title, body]) => (
                <li key={number} className="flex gap-3.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">{number}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-xs leading-5 text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Project Library Section */}
        <section aria-labelledby="maps-heading" className="pt-4">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Your Workspace</p>
              <h2 id="maps-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Reasoning Projects</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <Plus className="h-3.5 w-3.5" /> New Project
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const isStarter = project.id === "starter";
              return (
                <div
                  key={project.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl ${isStarter ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                        {isStarter ? <FolderGit2 className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}
                      </span>
                      {!isStarter && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (confirmDeleteProject === project.id) {
                                deleteProject(project.id);
                                setConfirmDeleteProject(null);
                              } else {
                                setConfirmDeleteProject(project.id);
                                setTimeout(() => setConfirmDeleteProject(null), 2500);
                              }
                            }}
                            className={`rounded-lg p-1.5 text-xs transition ${
                              confirmDeleteProject === project.id
                                ? "bg-rose-50 text-rose-700 font-semibold"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            }`}
                            title={confirmDeleteProject === project.id ? "Click again to confirm delete" : "Delete project"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">{project.name}</h3>
                    {isStarter && (
                      <p className="mt-1 text-xs text-slate-500">Moral and scientific reasoning mapped to bedrock foundations.</p>
                    )}

                    {/* Branch List */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Branches ({project.branches.length})</span>
                        {!isStarter && (
                          <button
                            onClick={() => setCreatingBranchForProject(project.id)}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 normal-case font-medium text-xs"
                          >
                            <Plus className="h-3 w-3" /> Add branch
                          </button>
                        )}
                      </div>

                      {project.branches.map((branch) => (
                        <div
                          key={branch.id}
                          onClick={() => setLocation(`/editor/${project.id}/${branch.id}`)}
                          className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 cursor-pointer transition"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <GitBranch className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                            <span className="truncate">{branch.name}</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-700 shrink-0 transition" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setLocation(`/editor/${project.id}/${project.branches[0]?.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Open Editor <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* New Project Modal */}
      {creating && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateProject();
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">New Reasoning Map</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">What are you exploring?</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="map-name">
              Project Name
            </label>
            <input
              id="map-name"
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ethics of Artificial Intelligence"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
            <p className="mt-2 text-xs text-slate-400">You can add multiple branches and explore competing derivations.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Branch Modal */}
      {creatingBranchForProject && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => event.target === event.currentTarget && setCreatingBranchForProject(null)}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateBranch(creatingBranchForProject);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">New Branch</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Name this derivation</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatingBranchForProject(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="branch-name">
              Branch Name
            </label>
            <input
              id="branch-name"
              ref={branchInputRef}
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder="e.g. Deontological Approach"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreatingBranchForProject(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!branchName.trim()}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
