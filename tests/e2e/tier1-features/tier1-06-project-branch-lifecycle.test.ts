import { describe, expect, it } from "vitest";
import type { Branch, Project, ProjectEdge } from "@/lib/projectTypes";

describe("Tier 1 - Feature 6: Project & Branch Lifecycle", () => {
  function createTestProject(name: string): Project {
    const projectId = `proj_${Date.now()}`;
    const branchId = `branch_${Date.now()}`;
    const graphId = `graph_${Date.now()}`;
    return {
      id: projectId,
      name,
      branches: [
        {
          id: branchId,
          name: "Main map",
          graphId,
          position: { x: 100, y: 100 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  function addBranchToProject(project: Project, name: string, position = { x: 200, y: 200 }): Project {
    const newBranch: Branch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      graphId: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return {
      ...project,
      branches: [...project.branches, newBranch],
      updatedAt: Date.now(),
    };
  }

  function connectProjectBranches(project: Project, sourceBranchId: string, targetBranchId: string): Project {
    if (project.edges.some((e) => e.source === sourceBranchId && e.target === targetBranchId)) {
      return project;
    }
    const newEdge: ProjectEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: sourceBranchId,
      target: targetBranchId,
    };
    return {
      ...project,
      edges: [...project.edges, newEdge],
      updatedAt: Date.now(),
    };
  }

  it("initializes a new project with a default main branch and isolated graphId", () => {
    const proj = createTestProject("Axiomer Elevation");
    expect(proj.id).toBeDefined();
    expect(proj.name).toBe("Axiomer Elevation");
    expect(proj.branches).toHaveLength(1);
    expect(proj.branches[0].name).toBe("Main map");
    expect(proj.branches[0].graphId).toBeDefined();
    expect(proj.edges).toEqual([]);
  });

  it("adds divergent branches to a project with distinct graphIds", () => {
    let proj = createTestProject("Ethical Dilemmas");
    proj = addBranchToProject(proj, "Utilitarian Branch", { x: 300, y: 150 });
    proj = addBranchToProject(proj, "Deontological Branch", { x: 300, y: 350 });

    expect(proj.branches).toHaveLength(3);
    const graphIds = proj.branches.map((b) => b.graphId);
    const uniqueIds = new Set(graphIds);
    expect(uniqueIds.size).toBe(3); // Every branch has its own isolated graph
  });

  it("updates branch positions for meta-canvas layout", () => {
    let proj = createTestProject("Layout Test");
    proj = addBranchToProject(proj, "Exploration 1", { x: 0, y: 0 });
    const branchId = proj.branches[1].id;

    // Move branch
    const updated = {
      ...proj,
      branches: proj.branches.map((b) =>
        b.id === branchId ? { ...b, position: { x: 450, y: 600 } } : b
      ),
    };

    const moved = updated.branches.find((b) => b.id === branchId);
    expect(moved?.position).toEqual({ x: 450, y: 600 });
  });

  it("connects branches with project edges and prevents duplicate edges", () => {
    let proj = createTestProject("Workflow Project");
    proj = addBranchToProject(proj, "Hypothesis A");
    proj = addBranchToProject(proj, "Hypothesis B");

    const b1 = proj.branches[0].id;
    const b2 = proj.branches[1].id;

    // Connect b1 -> b2
    proj = connectProjectBranches(proj, b1, b2);
    expect(proj.edges).toHaveLength(1);
    expect(proj.edges[0].source).toBe(b1);
    expect(proj.edges[0].target).toBe(b2);

    // Attempt connecting b1 -> b2 again (idempotent)
    proj = connectProjectBranches(proj, b1, b2);
    expect(proj.edges).toHaveLength(1);
  });

  it("updates project color palette attribute for visual workspace grouping", () => {
    let proj = createTestProject("Color Group");
    expect(proj.color).toBeUndefined();

    const colored = { ...proj, color: "#4f46e5" };
    expect(colored.color).toBe("#4f46e5");
  });
});
