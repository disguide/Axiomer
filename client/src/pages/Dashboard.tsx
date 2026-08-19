import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/hooks/useProjects";
import { ArrowRight, Check, GitFork, Layers3, Plus, Sparkles, X } from "lucide-react";

export default function Dashboard() {
  const { projects, createProject } = useProjects();
  const [, setLocation] = useLocation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const create = () => {
    const title = name.trim();
    if (!title) return;
    const project = createProject(title);
    const branch = project.branches[0];
    setCreating(false);
    setName("");
    setLocation(`/editor/${project.id}/${branch.id}`);
  };

  const maps = projects.flatMap((project) =>
    project.branches.map((branch) => ({ project, branch })),
  );

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-slate-900">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <nav className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5" aria-label="Axiomer home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <GitFork className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-[-0.03em]">Axiomer</span>
          </a>
          <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">
            Saved privately on this device
          </span>
        </nav>

        <section className="grid items-end gap-10 pb-14 pt-20 lg:grid-cols-[1.25fr_.75fr] lg:pt-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" /> Think past the first answer
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              See what your beliefs are built on.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Start with a question. Add the reasons for and against it. Keep asking why until every path reaches a value, fact, preference, or honest limit.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              <Plus className="h-4 w-4" /> Start a new map
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_-40px_rgba(15,23,42,.35)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">The whole method</p>
            <ol className="mt-5 space-y-5">
              {[
                ["1", "State it", "Write the claim or question plainly."],
                ["2", "Trace it", "Add support, conflict, evidence, and context."],
                ["3", "Ground it", "End each path at the foundation you actually accept."],
              ].map(([number, title, body]) => (
                <li key={number} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{number}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="maps-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your library</p>
              <h2 id="maps-heading" className="mt-1 text-2xl font-semibold tracking-tight">Reasoning maps</h2>
            </div>
            <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
              <Plus className="h-4 w-4" /> New map
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {maps.map(({ project, branch }) => {
              const starter = project.id === "starter";
              return (
                <button
                  type="button"
                  key={`${project.id}-${branch.id}`}
                  onClick={() => setLocation(`/editor/${project.id}/${branch.id}`)}
                  className="group min-h-48 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${starter ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                      {starter ? <Check className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                  </div>
                  <h3 className="mt-8 text-lg font-semibold tracking-tight text-slate-900">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{branch.name}</p>
                  {starter && <p className="mt-3 text-xs leading-5 text-slate-400">See a moral question and a scientific question traced to their foundations.</p>}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}>
          <form className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); create(); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">New reasoning map</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">What are you exploring?</h2>
              </div>
              <button type="button" onClick={() => setCreating(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="map-name">Map name</label>
            <input id="map-name" ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Should I change careers?" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" />
            <p className="mt-2 text-xs text-slate-400">You can add several claims and questions inside one map.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={!name.trim()} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Create map</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
