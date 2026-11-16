import * as LZString from "lz-string";
import type { Graph } from "./types";
import type { ThinkingProfile } from "./framework";
import { validateGraph } from "./io";

export interface SharedSnapshot {
  version: 1;
  title: string;
  graph: Graph;
  profile?: ThinkingProfile;
}
export const MAX_SHARE_LINK_LENGTH = 12000;
export const EMPTY_PROFILE: ThinkingProfile = { values: [], beliefs: [], personality: "" };

export function validateProfile(value: unknown): ThinkingProfile {
  if (!value || typeof value !== "object") throw new Error("Invalid personal context.");
  const p = value as Record<string, unknown>;
  for (const key of ["values", "beliefs"] as const) {
    if (!Array.isArray(p[key]) || p[key].length > 100 || p[key].some((v) => typeof v !== "string" || v.length > 2000)) throw new Error(`Invalid profile ${key}.`);
  }
  if (typeof p.personality !== "string" || p.personality.length > 10000) throw new Error("Invalid personality description.");
  return { values: p.values as string[], beliefs: p.beliefs as string[], personality: p.personality };
}
export function parseSnapshot(text: string): SharedSnapshot {
  if (text.length > 5 * 1024 * 1024) throw new Error("Choose a map smaller than 5 MB.");
  const value = JSON.parse(text);
  // Existing graph.json exports and older #tree links remain readable.
  if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) return { version: 1, title: "Shared reasoning map", graph: validateGraph(value) };
  if (!value || value.version !== 1 || typeof value.title !== "string" || value.title.length > 500) throw new Error("This isn't a supported Axiomer snapshot.");
  return { version: 1, title: value.title, graph: validateGraph(value.graph), ...(value.profile ? { profile: validateProfile(value.profile) } : {}) };
}
export function makeSnapshot(graph: Graph, title: string, profile?: ThinkingProfile): SharedSnapshot {
  return { version: 1, title: title.slice(0, 500), graph: validateGraph(graph), ...(profile ? { profile: validateProfile(profile) } : {}) };
}
export function snapshotLink(snapshot: SharedSnapshot, origin: string): string {
  const link = `${origin}/shared#tree=${LZString.compressToEncodedURIComponent(JSON.stringify(snapshot))}`;
  if (link.length > MAX_SHARE_LINK_LENGTH) throw new Error("This map is too large for a link. Download a snapshot file to share it.");
  return link;
}
export function snapshotFromHash(hash: string): SharedSnapshot {
  if (!hash.startsWith("#tree=") || hash.length > MAX_SHARE_LINK_LENGTH) throw new Error("This shared link is incomplete or too large. Ask for a snapshot file instead.");
  const text = LZString.decompressFromEncodedURIComponent(hash.slice(6));
  if (!text) throw new Error("This shared map couldn't be decoded.");
  return parseSnapshot(text);
}
