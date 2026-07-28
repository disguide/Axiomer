import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  onComplete: () => void;
}

const ETHICAL_OPTIONS = [
  "Utilitarianism (Maximize overall well-being)",
  "Deontology (Follow universal moral rules)",
  "Virtue Ethics (Cultivate moral character)",
  "Moral Relativism (Morals depend on culture/context)",
  "Nihilism (No objective moral truths)",
];

const WORLDVIEW_OPTIONS = [
  "Atheism (No deities exist)",
  "Theism (Belief in a creator/deity)",
  "Agnosticism (Truth is unknown/unknowable)",
  "Pantheism (The universe itself is divine)",
  "Determinism (All events are determined by causes)",
];

const VALUE_OPTIONS = [
  "Freedom", "Equality", "Truth", "Happiness", "Justice", "Compassion", "Knowledge"
];

export function BaselineTest({ onComplete }: Props) {
  const { updateArchetype, addBelief, addValue } = useProfile();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [ethics, setEthics] = useState<string>("");
  const [customEthics, setCustomEthics] = useState("");
  
  // Step 2 State
  const [worldview, setWorldview] = useState<string>("");
  const [customWorldview, setCustomWorldview] = useState("");

  // Step 3 State
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const toggleValue = (v: string) => {
    setSelectedValues(prev => 
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  const finishTest = () => {
    const finalEthics = ethics === "Other" ? customEthics : ethics;
    const finalWorldview = worldview === "Other" ? customWorldview : worldview;
    
    if (finalEthics.trim()) addBelief(`I believe in ${finalEthics}`);
    if (finalWorldview.trim()) addBelief(`My worldview aligns with ${finalWorldview}`);
    
    selectedValues.forEach(v => addValue(v));
    if (customValue.trim()) addValue(customValue);

    // Auto-generate archetype based on selections
    const archetypeWord1 = finalEthics.split(" ")[0].replace("ism", "ist");
    const archetypeWord2 = finalWorldview.split(" ")[0].replace("ism", "ist");
    const generated = `${archetypeWord1} ${archetypeWord2}`;
    updateArchetype(generated.trim() || "Philosopher");
    
    onComplete();
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Baseline Test</h2>
        <span className="text-sm font-medium text-slate-400">Step {step} of 3</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 mb-8">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">What is your primary ethical framework?</h3>
            <p className="text-sm text-slate-500 mb-4">Select the option that best describes how you determine right from wrong.</p>
          </div>
          <div className="space-y-3">
            {ETHICAL_OPTIONS.map(opt => (
              <label key={opt} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${ethics === opt ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                <input type="radio" name="ethics" value={opt} checked={ethics === opt} onChange={(e) => setEthics(e.target.value)} className="hidden" />
                <span className="font-medium text-slate-700">{opt}</span>
              </label>
            ))}
            <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${ethics === 'Other' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
              <div className="flex items-center">
                <input type="radio" name="ethics" value="Other" checked={ethics === 'Other'} onChange={(e) => setEthics(e.target.value)} className="hidden" />
                <span className="font-medium text-slate-700">Other (Custom)</span>
              </div>
              {ethics === 'Other' && (
                <input 
                  type="text" 
                  placeholder="Type your ethical framework..." 
                  value={customEthics} 
                  onChange={(e) => setCustomEthics(e.target.value)}
                  className="mt-3 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              )}
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">What is your baseline worldview regarding existence?</h3>
            <p className="text-sm text-slate-500 mb-4">Select the stance that grounds your perspective on reality.</p>
          </div>
          <div className="space-y-3">
            {WORLDVIEW_OPTIONS.map(opt => (
              <label key={opt} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${worldview === opt ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                <input type="radio" name="worldview" value={opt} checked={worldview === opt} onChange={(e) => setWorldview(e.target.value)} className="hidden" />
                <span className="font-medium text-slate-700">{opt}</span>
              </label>
            ))}
            <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${worldview === 'Other' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
              <div className="flex items-center">
                <input type="radio" name="worldview" value="Other" checked={worldview === 'Other'} onChange={(e) => setWorldview(e.target.value)} className="hidden" />
                <span className="font-medium text-slate-700">Other (Custom)</span>
              </div>
              {worldview === 'Other' && (
                <input 
                  type="text" 
                  placeholder="Type your worldview..." 
                  value={customWorldview} 
                  onChange={(e) => setCustomWorldview(e.target.value)}
                  className="mt-3 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              )}
            </label>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select your fundamental values</h3>
            <p className="text-sm text-slate-500 mb-4">Choose the core values that are most important to you.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {VALUE_OPTIONS.map(opt => {
              const isSelected = selectedValues.includes(opt);
              return (
                <button 
                  key={opt}
                  onClick={() => toggleValue(opt)}
                  className={`px-4 py-2 border rounded-full font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">Other (Custom Value)</label>
            <input 
              type="text" 
              placeholder="Type another value..." 
              value={customValue} 
              onChange={(e) => setCustomValue(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
        {step > 1 ? (
          <button onClick={handlePrev} className="px-5 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors">
            Back
          </button>
        ) : <div />}
        
        {step < 3 ? (
          <button 
            onClick={handleNext} 
            disabled={step === 1 ? (!ethics || (ethics === 'Other' && !customEthics)) : (!worldview || (worldview === 'Other' && !customWorldview))}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Next Step
          </button>
        ) : (
          <button 
            onClick={finishTest} 
            disabled={selectedValues.length === 0 && !customValue}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Complete Profile
          </button>
        )}
      </div>
    </div>
  );
}
