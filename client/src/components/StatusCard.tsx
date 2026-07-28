import type { ValueRank } from "../lib/graph";
import { NODE_META } from "../lib/meta";

interface Props {
  topValues: ValueRank[];
  archetype: string;
}

export function StatusCard({ topValues, archetype }: Props) {
  return (
    <div className="bg-white rounded-md p-6 mb-10 border border-slate-200 relative overflow-hidden">
      <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-6">
        Philosophical Identity
      </h2>
      
      <div className="space-y-4 mb-8">
        {topValues.length === 0 ? (
          <div className="text-slate-400 italic text-sm">
            No values grounded yet. Start exploring to discover your profile.
          </div>
        ) : (
          topValues.map((rank) => {
            const meta = NODE_META[rank.terminal.type];
            return (
              <div key={rank.terminal.id} className="flex items-start gap-3">
                <span className="text-xl shrink-0" style={{ color: meta.color }}>{meta.icon}</span>
                <span className="text-slate-900 font-semibold text-sm leading-tight mt-0.5">
                  {rank.terminal.content}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Archetype</div>
        <div className="text-sm font-bold text-slate-900 tracking-tight">
          "{archetype}"
        </div>
      </div>
    </div>
  );
}
