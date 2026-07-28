import type { StatusStats as Stats } from "../lib/graph";

interface Props {
  stats: Stats;
}

export function StatusStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
      <div className="bg-white border border-slate-200 rounded-md p-4 text-center">
        <div className="text-xl font-bold text-slate-900">{stats.totalClaims}</div>
        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Claims</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-md p-4 text-center">
        <div className="text-xl font-bold text-slate-900">
          <span className="text-slate-900">{stats.groundedClaims}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-500">{stats.openClaims}</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Grounded / Open</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-md p-4 text-center">
        <div className="text-xl font-bold text-slate-900">{stats.totalTerminals}</div>
        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Terminals</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-md p-4 text-center">
        <div className="text-xl font-bold text-slate-900">{Math.round(stats.convergenceRatio * 100)}%</div>
        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Convergence</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-md p-4 text-center">
        <div className="text-xl font-bold text-slate-900">{stats.valueClashes}</div>
        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Clashes</div>
      </div>
    </div>
  );
}
