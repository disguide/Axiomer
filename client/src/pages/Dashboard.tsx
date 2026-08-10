import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/hooks/useProjects";
import { Plus, ChevronRight, CornerDownRight, FolderGit2, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { projects, createProject, updateProjectColor, createBranch } = useProjects();
  const [, setLocation] = useLocation();
  
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingBranchFor, setIsCreatingBranchFor] = useState<string | null>(null);
  
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((isCreatingProject || isCreatingBranchFor) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingProject, isCreatingBranchFor]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const submitProject = () => {
    if (draftName.trim()) {
      const proj = createProject(draftName.trim());
      setExpandedProjects(prev => ({ ...prev, [proj.id]: true }));
    }
    setIsCreatingProject(false);
    setDraftName("");
  };

  const submitBranch = (projectId: string) => {
    if (draftName.trim()) {
      createBranch(projectId, draftName.trim());
    }
    setIsCreatingBranchFor(null);
    setDraftName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'project' | 'branch', projectId?: string) => {
    if (e.key === "Enter") {
      type === 'project' ? submitProject() : submitBranch(projectId!);
    } else if (e.key === "Escape") {
      setIsCreatingProject(false);
      setIsCreatingBranchFor(null);
      setDraftName("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-2xl">
        
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Axiomer Workspace</h1>
          <p className="text-slate-500">Select a project and branch to begin building your coherence tree.</p>
        </header>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header Action */}
          <div className="bg-slate-50/80 border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4" /> Your Projects
            </h2>
            <button
              onClick={() => { setIsCreatingProject(true); setDraftName(""); }}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          <div className="p-4 flex flex-col gap-2 min-h-[400px]">
            
            {isCreatingProject && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                <input
                  ref={inputRef}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'project')}
                  onBlur={submitProject}
                  placeholder="Enter project name..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                />
                <button onClick={submitProject} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">Create</button>
                <button onClick={() => {setIsCreatingProject(false); setDraftName("");}} className="text-sm font-medium text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
            )}

            {projects.length === 0 && !isCreatingProject && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FolderGit2 className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-1">No projects yet</h3>
                <p className="text-sm text-slate-500">Create a new project to start organizing your arguments.</p>
              </div>
            )}

            {projects.map((p) => {
              const isExpanded = expandedProjects[p.id];
              return (
                <div key={p.id} className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                  <div 
                    onClick={() => toggleExpand(p.id)}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-inner" style={{ backgroundColor: p.color || '#e2e8f0' }}>
                        <input
                          type="color"
                          value={p.color || "#e2e8f0"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateProjectColor(p.id, e.target.value)}
                          className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                          title="Change project color"
                        />
                      </div>
                      <span className="font-semibold text-slate-800 text-lg">{p.name}</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{p.branches.length} branches</span>
                    </div>
                    <button 
                      className="w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full flex items-center justify-center transition-all"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 px-5 py-3 flex flex-col gap-2">
                      {p.branches.map(b => (
                        <div key={b.id} className="flex items-center justify-between group bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <CornerDownRight className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{b.name}</div>
                              <div className="text-xs text-slate-400">Updated {new Date(b.updatedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setLocation(`/editor/${p.id}/${b.id}`)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md transition-all translate-x-2 group-hover:translate-x-0"
                          >
                            Open Editor <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {isCreatingBranchFor === p.id ? (
                        <div className="flex items-center gap-3 bg-white border border-indigo-200 rounded-lg p-3 mt-1 shadow-sm">
                           <CornerDownRight className="w-4 h-4 text-indigo-400" />
                           <input
                            ref={inputRef}
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'branch', p.id)}
                            onBlur={() => submitBranch(p.id)}
                            placeholder="Enter branch name..."
                            className="flex-1 text-sm focus:outline-none"
                          />
                          <button onClick={() => submitBranch(p.id)} className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Save</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setIsCreatingBranchFor(p.id); setDraftName(""); }}
                          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mt-2 px-2 py-1 transition-colors w-max"
                        >
                          <Plus className="w-4 h-4" /> Create new branch
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
