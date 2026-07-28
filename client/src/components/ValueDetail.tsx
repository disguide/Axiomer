import type { ValueChainDetail } from "../lib/graph";
import { NODE_META } from "../lib/meta";

interface Props {
  detail: ValueChainDetail;
}

export function ValueDetail({ detail }: Props) {
  return (
    <div className="pl-8 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
        Grounding Chains
      </div>
      
      <div className="space-y-4">
        {detail.groundingArgs.map((chain, idx) => {
          const rootMeta = chain.root ? NODE_META[chain.root.type] : null;
          
          return (
            <div key={chain.argument.id + idx} className="text-sm">
              {/* Root question/premise */}
              {chain.root && rootMeta && (
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-sm" style={{ color: rootMeta.color }}>{rootMeta.icon}</span>
                  <div className="flex-1 text-slate-900 font-medium leading-tight">
                    {chain.root.content}
                    {chain.root.type === "claim" && (
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                        chain.rootGrounded 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {chain.rootGrounded ? "Grounded" : "Open"}
                      </span>
                    )}
                    <span className="ml-2 text-slate-500 text-xs font-normal">
                      (Depth: {chain.depth})
                    </span>
                  </div>
                </div>
              )}
              
              {/* Grounding argument */}
              <div className="flex items-start gap-2 pl-6">
                <span className="text-slate-400">└</span>
                <span className="text-slate-500 italic flex-1">
                  "{chain.argument.content.length > 80 
                    ? chain.argument.content.substring(0, 80) + "..." 
                    : chain.argument.content}"
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
