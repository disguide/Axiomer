import { useEffect, useState } from "react";
import type { Project, Branch } from "@/lib/projectTypes";

export const PROJECTS_STORAGE_KEY = "axiomer_projects";

export const STARTER_PROJECT: Project = {
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

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function cleanupBranchStorage(graphId: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`axiomer_graph_${graphId}`);
    }
  } catch (err) {
    console.error("Failed to clean up branch storage", err);
  }
}

export function cleanupProjectStorage(project: Project): void {
  for (const branch of project.branches) {
    cleanupBranchStorage(branch.graphId);
  }
}

export function createDefaultProject(name = "Main project"): Project {
  return {
    id: generateId(),
    name,
    branches: [
      {
        id: generateId(),
        name: "Main map",
        graphId: generateId(),
        position: {
          x: typeof window !== "undefined" ? window.innerWidth / 2 - 100 : 200,
          y: typeof window !== "undefined" ? window.innerHeight / 2 - 50 : 200,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function deleteBranchFromProject(project: Project, branchId: string): Project {
  // Prevent deleting the last remaining branch
  if (project.branches.length <= 1) {
    return project;
  }

  const targetBranch = project.branches.find((b) => b.id === branchId);
  if (targetBranch) {
    cleanupBranchStorage(targetBranch.graphId);
  }

  return {
    ...project,
    branches: project.branches.filter((b) => b.id !== branchId),
    edges: (project.edges || []).filter(
      (e) => e.source !== branchId && e.target !== branchId
    ),
    updatedAt: Date.now(),
  };
}

export function deleteProjectFromList(projects: Project[], projectId: string): Project[] {
  const targetProject = projects.find((p) => p.id === projectId);
  if (targetProject) {
    cleanupProjectStorage(targetProject);
  }

  const remaining = projects.filter((p) => p.id !== projectId);
  if (remaining.length === 0) {
    return [createDefaultProject()];
  }
  return remaining;
}

export function loadProjects(): Project[] {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load projects", err);
  }
  return [STARTER_PROJECT];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      }
    } catch (err) {
      console.error("Failed to save projects", err);
    }
  }, [projects]);

  const createProject = (name: string): Project => {
    const newProject = createDefaultProject(name);
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => deleteProjectFromList(prev, projectId));
  };

  const createBranch = (projectId: string, name: string): Branch => {
    const newBranch: Branch = {
      id: generateId(),
      name,
      graphId: generateId(), // New empty graph
      position: {
        x: typeof window !== "undefined" ? window.innerWidth / 2 - 100 + Math.random() * 50 : 200,
        y: typeof window !== "undefined" ? window.innerHeight / 2 - 50 + Math.random() * 50 : 200,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          branches: [...p.branches, newBranch],
          updatedAt: Date.now(),
        };
      })
    );
    return newBranch;
  };

  const deleteBranch = (projectId: string, branchId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? deleteBranchFromProject(p, branchId) : p))
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
    setProjects,
    createProject,
    deleteProject,
    updateProjectColor,
    createBranch,
    deleteBranch,
    getProject,
    getBranch,
    moveBranch,
    connectBranches,
  };
}
