import { useMemo } from "react";
import type { Graph } from "../lib/types";
import { getStatusProfile } from "../lib/graph";
import { StatusStats } from "./StatusStats";
import { StatusCard } from "./StatusCard";
import { ValueLeaderboard } from "./ValueLeaderboard";

interface Props {
  graph: Graph;
}

export function StatusWindow({ graph }: Props) {
  // Profile computation is O(V·E), quite fast but derived on each render.
  // Memoizing to prevent recalculation when unrelated state changes.
  const profile = useMemo(() => getStatusProfile(graph), [graph]);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Philosophical Profile
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            A comprehensive look at the bedrock values underlying your arguments,
            ranked by how frequently your reasoning converges on them.
          </p>
        </header>

        <StatusStats stats={profile.stats} />

        {profile.rankedValues.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center shadow-sm">
            <div className="text-4xl mb-4">⚓</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No bedrock values yet</h3>
            <p className="text-slate-500">
              Ground your arguments to build a philosophical profile. The more you 
              explore, the clearer your foundational values will become.
            </p>
          </div>
        ) : (
          <>
            <StatusCard topValues={profile.topValues} archetype={profile.archetype} />
            <ValueLeaderboard rankedValues={profile.rankedValues} graph={graph} />
          </>
        )}
      </div>
    </div>
  );
}
