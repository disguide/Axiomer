import { useEffect, useRef, useState } from "react";
import type { Graph } from "@/lib/types";
import type { Project, Branch } from "@/lib/projectTypes";

const PROJECTS_STORAGE_KEY = "axiomer_projects";

const STARTER_PROJECT: Project = {
  id: "starter",
  name: "Axiomer examples",
  branches: [
    {
      id: "examples",
      name: "Two worked examples",
      graphId: "starter",
      position: { x: 0, y: 0 },
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  edges: [],
  createdAt: 0,
  updatedAt: 0,
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function loadProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.some((p) => !p || typeof p.id !== "string" || typeof p.name !== "string" || !Array.isArray(p.branches) || p.branches.some((b: Branch) => !b || typeof b.id !== "string" || typeof b.graphId !== "string" || typeof b.name !== "string"))) throw new Error("Saved map library is not valid");
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load projects", err);
  }
  return [STARTER_PROJECT];
}

export function useProjects() {
  const [projects, setProjectState] = useState<Project[]>(loadProjects);
  const changed = useRef(false);
  const setProjects: typeof setProjectState = (action) => { changed.current = true; setProjectState(action); };

  useEffect(() => {
    if (!changed.current) return;
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (err) {
      console.error("Failed to save projects", err);
    }
  }, [projects]);

  const createProject = (name: string, graph?: Graph) => {
    const newProject: Project = {
      id: generateId(),
      name,
      branches: [
        {
          id: generateId(),
          name: "Main map",
          graphId: generateId(),
          position: { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 50 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (graph) localStorage.setItem(`axiomer_graph_${newProject.branches[0].graphId}`, JSON.stringify(graph));
    const next = [newProject, ...projects];
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
    setProjects(next);
    return newProject;
  };

  const createBranch = (projectId: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newBranch: Branch = {
          id: generateId(),
          name,
          graphId: generateId(), // New empty graph
          position: { x: window.innerWidth / 2 - 100 + Math.random() * 50, y: window.innerHeight / 2 - 50 + Math.random() * 50 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          ...p,
          branches: [...p.branches, newBranch],
          updatedAt: Date.now(),
        };
      })
    );
  };

  const getProject = (id: string) => projects.find((p) => p.id === id);
  
  const getBranch = (projectId: string, branchId: string) => {
    const p = getProject(projectId);
    return p?.branches.find((b) => b.id === branchId);
  };

  const moveBranch = (projectId: string, branchId: string, position: { x: number; y: number }) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          branches: p.branches.map((b) => (b.id === branchId ? { ...b, position } : b)),
        };
      })
    );
  };

  const connectBranches = (projectId: string, sourceId: string, targetId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const currentEdges = p.edges || [];
        // Don't add duplicate edges
        if (currentEdges.some((e) => e.source === sourceId && e.target === targetId)) return p;
        return {
          ...p,
          edges: [...currentEdges, { id: generateId(), source: sourceId, target: targetId }],
        };
      })
    );
  };

  const updateProjectColor = (projectId: string, color: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, color } : p))
    );
  };

  return {
    projects,
    createProject,
    updateProjectColor,
    createBranch,
    getProject,
    getBranch,
    moveBranch,
    connectBranches,
  };
}
