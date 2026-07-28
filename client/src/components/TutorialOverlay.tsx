import { NODE_META } from "@/lib/meta";

interface Props {
  onClose: () => void;
}

export default function TutorialOverlay({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 tracking-tight">How to use Axiomer</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-slate-50">
          
          <section className="bg-white border border-slate-200 rounded-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">The Core Concept</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Axiomer is a tool for building rigorous argument trees. The goal is to trace surface-level <strong>Questions</strong> or <strong>Positions</strong> all the way down to bedrock <strong>Values</strong> and <strong>Principles</strong>.
            </p>
            <p className="text-slate-600 leading-relaxed">
              By forcing yourself to structurally link your arguments until they hit an epistemic limit or fundamental value, you can eliminate circular logic, identify your true philosophical profile, and build arguments that are undeniably grounded.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Navigating the Layout</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">1. Hierarchical Argument View</h4>
                <p className="text-slate-600 leading-relaxed">
                  This view focuses on a single "Thesis" block at a time. Below it, you'll see two columns: <strong>Validations</strong> and <strong>Objections</strong>. Clicking any of these child blocks will shift your focus down into the tree. You can trace your path back up using the breadcrumbs at the top.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">2. Map View</h4>
                <p className="text-slate-600 leading-relaxed">
                  The Map provides a bird's-eye view of your entire structural web. Use it to understand how disparate arguments converge on the same bedrock values. It's fully pan-and-zoomable.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base mb-2">3. The Sunburst Topology</h4>
                <p className="text-slate-600 leading-relaxed">
                  In the Argument View sidebar, the circular disk represents the depth of your argument. Green slices are supporting chains; red slices are attacking chains. You can click any slice to instantly jump to that node.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Understanding Node Types</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              There are over 20 distinct node types in Axiomer. Here are the most critical ones:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { type: "question", desc: "The starting point of an inquiry." },
                { type: "position", desc: "A stance answering a question." },
                { type: "argument-support", desc: "A standard supporting point." },
                { type: "argument-attack", desc: "A counter-point or objection." },
                { type: "value", desc: "TERMINAL: A fundamental moral or ethical anchor." },
                { type: "principle", desc: "TERMINAL: A foundational axiom or rule." },
                { type: "epistemic-limit", desc: "TERMINAL: The boundary of what can be known." },
                { type: "evidence-empirical", desc: "A piece of factual data." }
              ].map(({ type, desc }) => {
                const meta = NODE_META[type as keyof typeof NODE_META];
                return (
                  <div key={type} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xl shrink-0" style={{ color: meta.color }}>{meta.icon}</span>
                    <div>
                      <h5 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-1" style={{ color: meta.color }}>
                        {meta.label}
                      </h5>
                      <p className="text-sm text-slate-600">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
