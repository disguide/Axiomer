export type Kind = 'question' | 'claim' | 'source';
export type Relation = 'supports' | 'challenges' | 'context' | 'source';
export interface Statement {
  id: string; title: string; body: string; kind: Kind; topic: string;
  url: string; publisher: string; locator: string; version: number; created_at: string; updated_at: string;
}
export interface Connection { id: string; parent: string; child: string; relation: Relation; }
export interface Summary extends Statement { connections: number; sources: number; }
export interface Neighborhood {
  node: Summary; children: (Summary & { relation: Relation; edgeId: string })[];
  parents: (Summary & { relation: Relation; edgeId: string })[]; parentsNextCursor:string|null; counts: Record<Relation, number>; nextCursor: string | null;
}
export interface Page<T> { items: T[]; nextCursor: string | null; }
export interface Overview { nodes: number; connections: number; sources: number; proposals: number; topics: { topic: string; count: number }[]; }
export interface NodeDraft { title: string; body?: string; kind?: Kind; topic?: string; url?: string; publisher?: string; locator?: string; }
export interface Proposal { id: string; parent: string; base_version: number; relation: Relation; draft: NodeDraft; rationale: string; status: string; created_at: string; }
