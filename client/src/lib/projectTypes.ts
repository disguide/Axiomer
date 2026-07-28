export interface Branch {
  id: string;
  name: string;
  graphId: string; // Used to fetch the specific graph from localStorage
  position: { x: number; y: number }; // For the meta-canvas
  createdAt: number;
  updatedAt: number;
}

export interface ProjectEdge {
  id: string;
  source: string;
  target: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  branches: Branch[];
  edges: ProjectEdge[];
  createdAt: number;
  updatedAt: number;
}
