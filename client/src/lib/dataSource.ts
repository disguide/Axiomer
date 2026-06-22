// Chooses where the graph comes from, per the read-mostly architecture.
//
// - Authoring (local dev): editable, persisted in localStorage (see useGraph).
// - Public (deployed viewer): read-only, loads the canonical data/graph.json.
//
// Toggled by VITE_PUBLIC_READONLY=1 at build time. The canonical graph is a
// static asset (client/public/graph.json) fetched at runtime and validated.

import type { Graph } from "./types";
import { validateGraph } from "./io";

export function isReadOnly(): boolean {
  return import.meta.env.VITE_PUBLIC_READONLY === "1";
}

export async function loadCanonicalGraph(): Promise<Graph> {
  const res = await fetch(`${import.meta.env.BASE_URL}graph.json`);
  if (!res.ok) throw new Error(`graph.json HTTP ${res.status}`);
  return validateGraph(await res.json());
}
