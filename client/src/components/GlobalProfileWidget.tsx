import { useState } from "react";
import { useLocation } from "wouter";
import { useProfile } from "@/hooks/useProfile";
import { X, User } from "lucide-react";

export function GlobalProfileWidget() {
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col items-end">
      {/* The trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-pill shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <User className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-semibold pr-1">Profile</span>
      </button>

      {/* The panel with a connecting "arrow" gap via margin */}
      {isOpen && (
        <div className="w-80 mt-2 bg-[var(--color-glass-solid)] backdrop-blur-[var(--blur-glass-heavy)] border border-slate-200/60 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">Universal Values</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {profile.values.length === 0 && profile.beliefs.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 italic mb-4">
                You haven't mapped out your core beliefs yet.
              </p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setLocation("/profile");
                }}
                className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Map Core Values
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {profile.archetype && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Archetype</div>
                  <div className="text-lg font-semibold text-slate-800">{profile.archetype}</div>
                </div>
              )}
              
              {profile.values.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Values</div>
                  <ul className="space-y-2">
                    {profile.values.slice(0, 5).map((val, i) => (
                      <li key={i} className="flex justify-between items-center bg-amber-50/50 border border-amber-100/50 rounded-md p-2">
                        <span className="text-sm font-medium text-amber-900 truncate">{val}</span>
                      </li>
                    ))}
                    {profile.values.length > 5 && (
                      <li className="text-xs text-slate-400 italic text-center pt-1">+ {profile.values.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {profile.beliefs.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Beliefs</div>
                  <ul className="space-y-2">
                    {profile.beliefs.slice(0, 5).map((belief, i) => (
                      <li key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-md p-2">
                        <span className="text-sm font-medium text-slate-700 truncate">{belief}</span>
                      </li>
                    ))}
                    {profile.beliefs.length > 5 && (
                      <li className="text-xs text-slate-400 italic text-center pt-1">+ {profile.beliefs.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  setIsOpen(false);
                  setLocation("/profile");
                }}
                className="w-full mt-4 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg py-2 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
