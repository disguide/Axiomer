import { Anchor, CheckCircle2, GitFork, MessageSquare, X } from "lucide-react";

export default function TutorialOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto my-8 w-full max-w-2xl rounded-2xl border border-white/70 bg-white p-6 shadow-2xl sm:my-16 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><GitFork className="h-4 w-4" /></span>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950">How Axiomer works</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Axiomer helps you make the reasoning beneath a belief visible. There is no score and no required ideology.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close guide"><X className="h-4 w-4" /></button>
        </div>

        <ol className="mt-8 space-y-4">
          {[
            { icon: MessageSquare, color: "bg-blue-50 text-blue-700", title: "1. State one thought", body: "Begin with a question, decision, or belief in ordinary language." },
            { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700", title: "2. Add what bears on it", body: "Select the thought and add support, conflict, or context. Repeat as deeply as useful." },
            { icon: Anchor, color: "bg-amber-50 text-amber-700", title: "3. Name the foundation", body: "End each path at a value, source, preference, bedrock fact, or the limit of what can be known." },
          ].map(({ icon: Icon, color, title, body }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></span>
              <div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p></div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
          <p><strong className="text-slate-800">Map</strong><br />See structure, convergence, and the path around a selected thought.</p>
          <p><strong className="text-slate-800">Outline</strong><br />Read and write the same reasoning as a calm nested document.</p>
        </div>

        <div className="mt-7 flex justify-end"><button onClick={onClose} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Start mapping</button></div>
      </div>
    </div>
  );
}
