export type Kind = 'question' | 'claim' | 'source';
export type Relation = 'supports' | 'challenges' | 'context' | 'source';
export interface Statement {
  id: string; title: string; body: string; kind: Kind; topic: string;
  url: string; publisher: string; locator: string; version: number; created_at: string; updated_at: string;
}
export interface Connection { id: string; parent: string; child: string; relation: Relation; }
export interface Summary extends Statement { connections: number; sources: number; project_id?:string|null; folder_id?:string|null; labels?:string[]; labelsOrigin?:string; abstract?:string; provenance?:Record<string,unknown>; listed?:boolean; }
export interface Neighborhood {
  node: Summary; children: (Summary & { relation: Relation; edgeId: string; origin?:string; rationale?:string })[];
  parents: (Summary & { relation: Relation; edgeId: string })[]; parentsNextCursor:string|null; counts: Record<Relation, number>; nextCursor: string | null;
}
export interface Page<T> { items: T[]; nextCursor: string | null; }
export interface Overview { nodes: number; connections: number; sources: number; proposals: number; topics: { topic: string; count: number }[]; }
export interface NodeDraft { title: string; body?: string; kind?: Kind; topic?: string; url?: string; publisher?: string; locator?: string; }
export interface Proposal { id: string; parent: string; base_version: number; relation: Relation; draft: NodeDraft; rationale: string; status: string; created_at: string; }
export interface Project { id:string; name:string; description:string; created_at:string; updated_at:string; items:number; folders:number; }
export interface Folder { id:string; project_id:string; name:string; created_at:string; updated_at:string; items:number; }
export interface Destination { projectId:string|null; folderId?:string|null; }
export interface Attachment { checksum?:string; id:string; node_id:string; name:string; path:string; mime:string; size:number; created_at:string; }
export interface NodeDetails { node_id:string; labels:string; labels_origin:string; abstract:string; provenance:string; listed:number; location_locked:number; analyzed_version:number; }
export interface GraphBundle {
  format:'axiomer'; schemaVersion:3; exportedAt:string; complete:boolean; scope:string;
  projects:Project[]; folders:Folder[]; nodes:(Statement & {details?:Partial<NodeDetails>})[];
  edges:(Connection & {origin?:string;rationale?:string})[];
  locations:{node_id:string;project_id:string;folder_id:string|null}[];
  attachments?:Attachment[];
}
