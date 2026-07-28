import { useState } from "react";
import type { Graph } from "../lib/types";
import type { ValueRank } from "../lib/graph";
import { getValueChainDetail } from "../lib/graph";
import { NODE_META } from "../lib/meta";
import { ValueDetail } from "./ValueDetail";

interface Props {
  rankedValues: ValueRank[];
  graph: Graph;
}

export function ValueLeaderboard({ rankedValues, graph }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rankedValues.length === 0) {
    return null; // Handled by StatusWindow empty state
  }

  const maxConvergence = Math.max(...rankedValues.map(r => r.convergenceCount));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden mb-10 transition-shadow">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Terminal Values Leaderboard
        </h2>
      </div>
      
      <div className="divide-y divide-slate-100">
        {rankedValues.map((rank, index) => {
          const isExpanded = expandedId === rank.terminal.id;
          const meta = NODE_META[rank.terminal.type];
          const isConvergent = rank.convergenceCount > 1;
          
          // Calculate proportional bar width based on max convergence
          const barWidth = maxConvergence > 0 
            ? `${Math.max(5, (rank.convergenceCount / maxConvergence) * 100)}%` 
            : '0%';

          return (
            <div key={rank.terminal.id} className="flex flex-col">
              <button
                className={`w-full px-8 py-5 flex items-center gap-4 text-left transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : rank.terminal.id)}
              >
                <div className="w-6 text-center font-bold text-slate-400 text-sm">
                  #{index + 1}
                </div>
                
                <div className="text-2xl" style={{ color: meta.color }}>
                  {meta.icon}
                </div>
                
                <div className="flex-1 font-bold text-slate-900 line-clamp-1 text-lg">
                  {rank.terminal.content}
                </div>
                
                <div className="w-24 hidden sm:flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isConvergent ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>

                <div className="w-16 text-right text-sm font-semibold text-slate-500">
                  {rank.convergenceCount} {rank.convergenceCount === 1 ? 'root' : 'roots'}
                </div>
                
                <div className="w-6 text-slate-400">
                  {isExpanded ? '▼' : '▶'}
                </div>
              </button>
              
              {isExpanded && (
                <ValueDetail detail={getValueChainDetail(graph, rank.terminal.id)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
