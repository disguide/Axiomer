import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  onComplete: (premises: string[], values: string[]) => void;
}

export function GraphSetupWizard({ onComplete }: Props) {
  const { profile } = useProfile();
  const [step, setStep] = useState(1);
  
  // Step 1: Premises
  const [selectedPremises, setSelectedPremises] = useState<string[]>([]);
  const [customPremise, setCustomPremise] = useState("");

  // Step 2: Values
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");

  const handleNext = () => setStep(2);
  const handlePrev = () => setStep(1);

  const togglePremise = (p: string) => {
    setSelectedPremises(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const toggleValue = (v: string) => {
    setSelectedValues(prev => 
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  const finishSetup = () => {
    const finalPremises = [...selectedPremises];
    const finalValues = [...selectedValues];
    
    if (customPremise.trim()) finalPremises.push(customPremise.trim());
    if (customValue.trim()) finalValues.push(customValue.trim());
    
    onComplete(finalPremises, finalValues);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Graph Setup</h2>
          <span className="text-sm font-medium text-slate-400">Step {step} of 2</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2 mb-8">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Step 1: Set Premises</h3>
              <p className="text-sm text-slate-500 mb-4">Select or type the absolute baseline facts or beliefs for this argument.</p>
            </div>
            
            {profile.beliefs.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">From your profile:</span>
                <div className="flex flex-wrap gap-2">
                  {profile.beliefs.map(opt => {
                    const isSelected = selectedPremises.includes(opt);
                    return (
                      <button 
                        key={opt}
                        onClick={() => togglePremise(opt)}
                        className={`px-4 py-2 border rounded-full text-sm font-medium transition-all text-left ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                      >
                        {isSelected ? '✓ ' : '+ '}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Other (Custom Premise)</label>
              <input 
                type="text" 
                placeholder="e.g., The market is saturated..." 
                value={customPremise} 
                onChange={(e) => setCustomPremise(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Step 2: Set Core Values</h3>
              <p className="text-sm text-slate-500 mb-4">Select or type the ultimate terminal values this argument is optimizing for.</p>
            </div>
            
            {profile.values.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">From your profile:</span>
                <div className="flex flex-wrap gap-2">
                  {profile.values.map(opt => {
                    const isSelected = selectedValues.includes(opt);
                    return (
                      <button 
                        key={opt}
                        onClick={() => toggleValue(opt)}
                        className={`px-4 py-2 border rounded-full text-sm font-medium transition-all text-left ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                      >
                        {isSelected ? '✓ ' : '+ '}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Other (Custom Value)</label>
              <input 
                type="text" 
                placeholder="e.g., Growth, Sustainability..." 
                value={customValue} 
                onChange={(e) => setCustomValue(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
          {step === 2 ? (
            <button onClick={handlePrev} className="px-5 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors">
              Back
            </button>
          ) : (
            <button onClick={() => onComplete([], [])} className="px-5 py-2.5 rounded-lg text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors">
              Skip Setup
            </button>
          )}
          
          {step === 1 ? (
            <button 
              onClick={handleNext} 
              disabled={selectedPremises.length === 0 && !customPremise.trim()}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          ) : (
            <button 
              onClick={finishSetup} 
              disabled={selectedValues.length === 0 && !customValue.trim()}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Spawn Nodes
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
