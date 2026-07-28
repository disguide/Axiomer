import { useState } from "react";
import { Link } from "wouter";
import { useProfile } from "@/hooks/useProfile";
import { BaselineTest } from "@/components/BaselineTest";

export default function ProfileEditor() {
  const { profile, updateArchetype, addValue, removeValue, addBelief, removeBelief } = useProfile();
  
  const [newValue, setNewValue] = useState("");
  const [newBelief, setNewBelief] = useState("");
  
  // Show test if the profile is empty or if they explicitly want to retake it
  const isProfileEmpty = profile.values.length === 0 && profile.beliefs.length === 0;
  const [showTest, setShowTest] = useState(isProfileEmpty);

  const handleAddValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (newValue.trim()) {
      addValue(newValue);
      setNewValue("");
    }
  };

  const handleAddBelief = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBelief.trim()) {
      addBelief(newBelief);
      setNewBelief("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Philosophical Profile
            </h1>
            <p className="text-slate-500 mt-1">
              Map out your core universal values and beliefs.
            </p>
          </div>
          <Link href="/">
            <a className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
              &larr; Back to Dashboard
            </a>
          </Link>
        </header>

        {showTest ? (
          <BaselineTest onComplete={() => setShowTest(false)} />
        ) : (
          <div className="bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl p-8 space-y-10">
            
            {/* Show Take Test Button again if they cleared everything */}
            {isProfileEmpty && (
              <div className="text-center pb-6 border-b border-slate-100">
                <button
                  onClick={() => setShowTest(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  Take Baseline Setup Test
                </button>
              </div>
            )}
          
          {/* Archetype Section */}
          <section>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Philosophical Archetype
            </label>
            <input
              type="text"
              value={profile.archetype}
              onChange={(e) => updateArchetype(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              placeholder="e.g., Pragmatist, Humanist, Idealist"
            />
          </section>

          <hr className="border-slate-100" />

          {/* Values Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                Core Values
              </h2>
              <p className="text-sm text-slate-500">
                What fundamental concepts do you prioritize? (e.g., Freedom, Equality, Knowledge)
              </p>
            </div>
            
            <form onSubmit={handleAddValue} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Add a new value..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Add
              </button>
            </form>

            {profile.values.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-lg border-dashed">
                <span className="text-slate-400 text-sm">No values added yet.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {profile.values.map((val, i) => (
                  <li key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 shadow-sm group">
                    <span className="font-medium text-slate-700">{val}</span>
                    <button
                      onClick={() => removeValue(i)}
                      className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* Beliefs/Premises Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                Core Beliefs & Premises
              </h2>
              <p className="text-sm text-slate-500">
                What are the axiomatic foundations of your worldview? (e.g., "I am an atheist")
              </p>
            </div>
            
            <form onSubmit={handleAddBelief} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBelief}
                onChange={(e) => setNewBelief(e.target.value)}
                placeholder="Add a new belief..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm"
              >
                Add
              </button>
            </form>

            {profile.beliefs.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-lg border-dashed">
                <span className="text-slate-400 text-sm">No beliefs added yet.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {profile.beliefs.map((belief, i) => (
                  <li key={i} className="flex items-start justify-between bg-white border border-slate-200 rounded-lg p-3 shadow-sm group">
                    <span className="font-medium text-slate-700 leading-snug pr-4">{belief}</span>
                    <button
                      onClick={() => removeBelief(i)}
                      className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 mt-0.5 shrink-0"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
        )}
      </div>
    </div>
  );
}
