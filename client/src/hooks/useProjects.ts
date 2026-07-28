import { useEffect, useState } from "react";
import type { Project, Branch } from "@/lib/projectTypes";

const PROJECTS_STORAGE_KEY = "axiomer_projects";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function loadProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load projects", err);
  }
  return [];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects());

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (err) {
      console.error("Failed to save projects", err);
    }
  }, [projects]);

  const createProject = (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      branches: [
        {
          id: generateId(),
          name: "Main",
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
    setProjects((prev) => [newProject, ...prev]);
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
