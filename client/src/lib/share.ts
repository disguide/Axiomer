// Share a graph as a link: the whole graph, compressed into the URL hash.
// No server, no account — the link IS the data. The receiver's app decodes,
// validates (io.ts strictness), and offers to import as a draft; nothing is
// clobbered without consent.
//
// Format: #g=<lz-string compressToEncodedURIComponent of the graph JSON>.
// Typical graphs compress to a few KB; very large graphs should use file
// export instead (the UI says so past the soft limit).

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { Graph } from "./types";
import { exportGraph, validateGraph } from "./io";

export const SHARE_HASH_PREFIX = "#g=";

// Links beyond this are unreliable across chat apps/browsers; nudge to file.
export const SHARE_SOFT_LIMIT = 16_000;

export function encodeGraphShare(graph: Graph): string {
  return compressToEncodedURIComponent(exportGraph(graph));
}

export function decodeGraphShare(encoded: string): Graph {
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json) throw new Error("share link is corrupted or truncated");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("share link does not contain valid JSON");
  }
  return validateGraph(parsed); // same strict gate as file import
}

export function buildShareUrl(graph: Graph, baseUrl: string): string {
  const base = baseUrl.split("#")[0];
  return `${base}${SHARE_HASH_PREFIX}${encodeGraphShare(graph)}`;
}

// Extract and decode an incoming share from a location hash.
// Returns null when the hash isn't a share link; throws when it is one but
// fails to decode/validate (the UI reports that).
export function parseShareHash(hash: string): Graph | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  return decodeGraphShare(hash.slice(SHARE_HASH_PREFIX.length));
}
