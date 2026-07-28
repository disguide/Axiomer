import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/hooks/useProjects";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  Handle,
  Position,
} from "@xyflow/react";
import type { Node, Edge, Connection, NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, ChevronRight, CornerDownRight } from "lucide-react";

// Custom node for branches
function BranchNode({ data }: { data: { label: string; date: number; onClick: () => void } }) {
  return (
    <div
      onDoubleClick={data.onClick}
      className="p-5 bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] hover:shadow-md hover:border-slate-300 transition-all cursor-pointer min-w-[200px]"
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-white bg-slate-400" />
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-slate-800 text-lg">{data.label}</h3>
        <div className="text-xs text-slate-500">
          Updated {new Date(data.date).toLocaleDateString()}
        </div>
        <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider font-semibold">
          Double-click to open
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-white bg-slate-400" />
    </div>
  );
}

const nodeTypes = {
  branch: BranchNode,
};

export default function Dashboard() {
  const { projects, createProject, updateProjectColor, createBranch, moveBranch, connectBranches } = useProjects();
  const [, setLocation] = useLocation();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Inline creation state
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((isCreatingProject || isCreatingBranch) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingProject, isCreatingBranch]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const submitProject = () => {
    if (draftName.trim()) {
      const proj = createProject(draftName.trim());
      setActiveProjectId(proj.id);
      setExpandedProjects(prev => ({ ...prev, [proj.id]: true }));
    }
    setIsCreatingProject(false);
    setDraftName("");
  };

  const submitBranch = () => {
    if (draftName.trim() && activeProjectId) {
      createBranch(activeProjectId, draftName.trim());
    }
    setIsCreatingBranch(false);
    setDraftName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'project' | 'branch') => {
    if (e.key === "Enter") {
      type === 'project' ? submitProject() : submitBranch();
    } else if (e.key === "Escape") {
      setIsCreatingProject(false);
      setIsCreatingBranch(false);
      setDraftName("");
    }
  };

  const initialNodes: Node[] = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.branches.map((b, i) => ({
      id: b.id,
      type: "branch",
      position: b.position || { x: 100 + i * 20, y: 100 + i * 20 },
      data: {
        label: b.name,
        date: b.updatedAt,
        onClick: () => setLocation(`/editor/${activeProject.id}/${b.id}`),
      },
    }));
  }, [activeProject, setLocation]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!activeProject) return [];
    return (activeProject.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    }));
  }, [activeProject]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Sync state using useEffect, not useMemo
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!activeProjectId) return;
      setNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((c) => {
        if (c.type === "position" && c.position) {
          moveBranch(activeProjectId, c.id, c.position);
        }
      });
    },
    [activeProjectId, moveBranch]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!activeProjectId) return;
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: "#94a3b8", strokeWidth: 2 } }, eds));
      if (connection.source && connection.target) {
        connectBranches(activeProjectId, connection.source, connection.target);
      }
    },
    [activeProjectId, connectBranches]
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col">
      <header className="sticky top-0 z-[var(--z-header)] border-b border-slate-200/60 bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] shadow-sm">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-6 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Axiomer Workspace</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar for Projects */}
        <aside className="w-64 border-r border-slate-200/60 bg-[var(--color-glass-subtle)] backdrop-blur-[var(--blur-glass)] p-4 flex flex-col gap-6 z-10 relative">
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projects</h2>
              <button
                onClick={() => { setIsCreatingProject(true); setDraftName(""); }}
                className="text-slate-400 hover:text-slate-800 transition-colors p-1"
                title="New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              {isCreatingProject && (
                <div className="px-2 py-2 mb-1">
                  <input
                    ref={inputRef}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'project')}
                    onBlur={submitProject}
                    placeholder="Project name..."
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                  />
                </div>
              )}

              {projects.length === 0 && !isCreatingProject && (
                <div className="text-xs text-slate-400 italic px-2">No projects yet.</div>
              )}
              
              {projects.map((p) => {
                const isActive = activeProjectId === p.id;
                const isExpanded = expandedProjects[p.id];
                return (
                  <div key={p.id} className="flex flex-col gap-1 mb-1">
                    <div 
                      onClick={() => setActiveProjectId(p.id)}
                      className={`group flex items-center justify-between text-left px-2 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-white shadow-sm border border-slate-200/60 text-slate-900"
                          : "text-slate-600 hover:bg-slate-100/50"
                      }`}
                      style={p.color ? { borderLeft: `4px solid ${p.color}` } : { borderLeft: `4px solid transparent` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={(e) => toggleExpand(p.id, e)}
                          className="w-5 h-5 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-transform"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </div>
                      
                      <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 border border-slate-200" style={{ backgroundColor: p.color || '#e2e8f0' }}>
                        <input
                          type="color"
                          value={p.color || "#e2e8f0"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateProjectColor(p.id, e.target.value)}
                          className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                          title="Change project color"
                        />
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="flex flex-col gap-0.5 pl-8 pr-2 pb-1">
                        {p.branches.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setLocation(`/editor/${p.id}/${b.id}`)}
                            className="flex items-center gap-1.5 text-left text-xs px-2 py-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors truncate"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="truncate">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Area: The Meta-Canvas */}
        <main className="flex-1 relative bg-slate-50/50">
          {activeProject ? (
            <>
              {/* Floating Header in Canvas */}
              <div className="absolute top-6 left-6 z-10 bg-[var(--color-glass)] backdrop-blur-[var(--blur-glass)] border border-slate-200/60 px-6 py-4 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] flex items-center justify-between gap-8">
                <h1 className="text-2xl font-bold text-slate-900">{activeProject.name} Branches</h1>
                
                {isCreatingBranch ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'branch')}
                      onBlur={submitBranch}
                      placeholder="Branch name..."
                      className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsCreatingBranch(true); setDraftName(""); }}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> New Branch
                  </button>
                )}
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="w-full h-full"
              >
                <Background color="#cbd5e1" gap={24} size={2} />
                <Controls className="bg-white/80 backdrop-blur-sm border-slate-200" />
              </ReactFlow>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p>Select or create a project to view its branch canvas.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
