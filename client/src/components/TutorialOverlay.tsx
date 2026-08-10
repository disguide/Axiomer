import { NODE_META } from "@/lib/meta";
import type { NodeType } from "@/lib/types";

interface Props {
  onClose: () => void;
}

export default function TutorialOverlay({ onClose }: Props) {
  // We want to group the types to explain the layers clearly.
  const coreTypes: NodeType[] = ["claim", "premise", "support", "conflict", "note"];
  const terminalTypes: NodeType[] = ["bedrock", "value", "preference", "limit", "source"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-white/70 backdrop-blur-3xl rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white/50 w-full max-w-4xl h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-200/50 bg-white/40">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Help Guide & Vocabulary</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 bg-white/50 hover:bg-white border border-slate-200/50 rounded-full px-4 py-1.5 text-sm font-semibold transition-all shadow-sm"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-slate-50/30">
          
          <section className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">The Axiomer Philosophy</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Axiomer is a tool for building rigorous argument trees. The goal is to trace surface-level <strong>Claims</strong> and <strong>Premises</strong> all the way down to undeniable <strong>Bedrocks</strong>, subjective <strong>Preferences</strong>, or foundational <strong>Values</strong>.
            </p>
            <p className="text-slate-600 leading-relaxed">
              By forcing yourself to structurally link your arguments until they hit a terminal node, you can eliminate circular logic, identify your true philosophical profile, and build arguments that are undeniably grounded.
            </p>
          </section>

          <section className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">The Terminal Layers (You cannot go deeper)</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              A fully grounded argument must bottom out at one of these terminal nodes. Understanding the difference between these layers is key to using Axiomer.
            </p>
            <div className="grid grid-cols-1 gap-4">
              {terminalTypes.map((type) => {
                const meta = NODE_META[type];
                return (
                  <div key={type} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-2xl shrink-0 mt-1" style={{ color: meta.color }}>{meta.icon}</span>
                    <div>
                      <h5 className="font-bold text-slate-800 uppercase tracking-wider text-sm mb-1" style={{ color: meta.color }}>
                        {meta.label}
                      </h5>
                      <p className="text-sm text-slate-700 font-medium mb-1">{meta.description}</p>
                      <p className="text-sm text-slate-500 italic">Example: "{meta.placeholder}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">The Argument Layers (Structural Nodes)</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              These are the non-terminal nodes used to construct the logic, questions, and evidence of your tree.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coreTypes.map((type) => {
                const meta = NODE_META[type];
                return (
                  <div key={type} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xl shrink-0 mt-0.5" style={{ color: meta.color }}>{meta.icon}</span>
                    <div>
                      <h5 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-1" style={{ color: meta.color }}>
                        {meta.label}
                      </h5>
                      <p className="text-sm text-slate-600">{meta.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Keyboard-First Building (Tree View)</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Axiomer is designed to be built at the speed of thought. You can build an entire tree without touching your mouse.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-3">
                <kbd className="font-mono bg-slate-100 border border-slate-300 px-2 py-1 rounded text-xs">Enter</kbd>
                <span>Save the current node you are editing.</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="font-mono bg-slate-100 border border-slate-300 px-2 py-1 rounded text-xs">Tab</kbd>
                <span>Instantly spawn a child node beneath the current one.</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="font-mono bg-slate-100 border border-slate-300 px-2 py-1 rounded text-xs">/</kbd>
                <span>Type forward-slash to open the <strong>Command Menu</strong> and select your node type (e.g. Support, Conflict, Value).</span>
              </li>
            </ul>
          </section>

          <section className="bg-white/60 backdrop-blur-md border border-slate-200/50 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Fluid Mind-Mapping (Map View)</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Quick-Spawn Handles</h4>
                <p className="text-slate-600 leading-relaxed text-sm">
                  Click any node on the canvas to select it. You will see <strong>Green</strong> and <strong>Red</strong> handles appear beneath it. Click them to instantly spawn connected supporting or conflicting branches.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Bird's-eye Context</h4>
                <p className="text-slate-600 leading-relaxed text-sm">
                  The Map View provides a macro perspective of your structural web to understand how disparate arguments converge on the same bedrock values.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
