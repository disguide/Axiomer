import { sqliteTable, text, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
export const nodes = sqliteTable('nodes', {
  id: text('id').primaryKey(), title: text('title').notNull(), body: text('body').notNull().default(''),
  kind: text('kind').notNull().default('claim'), topic: text('topic').notNull().default('General'),
  url: text('url').notNull().default(''), publisher: text('publisher').notNull().default(''), locator: text('locator').notNull().default(''),
  version: integer('version').notNull().default(1), created_at: text('created_at').notNull(), updated_at: text('updated_at').notNull(),
}, t=>[index('nodes_topic_kind_id').on(t.topic,t.kind,t.id),index('nodes_kind_id').on(t.kind,t.id)]);
export const edges = sqliteTable('edges', {
  id:text('id').primaryKey(), parent:text('parent').notNull().references(()=>nodes.id), child:text('child').notNull().references(()=>nodes.id), relation:text('relation').notNull(),
}, t=>[uniqueIndex('edges_parent_child_relation').on(t.parent,t.child,t.relation),index('edges_parent_id').on(t.parent,t.id),index('edges_child_id').on(t.child,t.id)]);
export const proposals = sqliteTable('proposals', {
  id:text('id').primaryKey(), parent:text('parent').notNull().references(()=>nodes.id), base_version:integer('base_version').notNull(),
  relation:text('relation').notNull(), draft:text('draft').notNull(), rationale:text('rationale').notNull(), status:text('status').notNull().default('pending'),
  created_at:text('created_at').notNull(),
},t=>[index('proposals_status_id').on(t.status,t.id)]);
export const revisions = sqliteTable('revisions', { id:text('id').primaryKey(),node_id:text('node_id').notNull(),version:integer('version').notNull(),snapshot:text('snapshot').notNull(),created_at:text('created_at').notNull() },t=>[index('revisions_node_version').on(t.node_id,t.version)]);
export const metadata = sqliteTable('metadata', {key:text('key').primaryKey(),value:text('value').notNull()});
export const counters = sqliteTable('counters', {key:text('key').primaryKey(),value:integer('value').notNull().default(0)});
export const topicCounts = sqliteTable('topic_counts', {topic:text('topic').primaryKey(),count:integer('count').notNull().default(0)}, t=>[index('topic_counts_count').on(t.count)]);
export const projects = sqliteTable('projects', {
  id:text('id').primaryKey(), name:text('name').notNull(), description:text('description').notNull().default(''),
  created_at:text('created_at').notNull(), updated_at:text('updated_at').notNull(),
});
export const folders = sqliteTable('folders', {
  id:text('id').primaryKey(), project_id:text('project_id').notNull().references(()=>projects.id),
  name:text('name').notNull(), created_at:text('created_at').notNull(), updated_at:text('updated_at').notNull(),
},t=>[uniqueIndex('folders_project_id').on(t.project_id,t.id)]);
// Filing a node changes its home, never its identity or graph connections.
export const itemLocations = sqliteTable('item_locations', {
  node_id:text('node_id').primaryKey().references(()=>nodes.id),
  project_id:text('project_id').notNull().references(()=>projects.id), folder_id:text('folder_id'),
},t=>[
  foreignKey({columns:[t.project_id,t.folder_id],foreignColumns:[folders.project_id,folders.id]}),
  index('locations_project_node').on(t.project_id,t.node_id),
  index('locations_project_folder_node').on(t.project_id,t.folder_id,t.node_id),
]);
export const nodeDetails=sqliteTable('node_details',{
  node_id:text('node_id').primaryKey().references(()=>nodes.id), labels:text('labels').notNull().default('[]'),
  labels_origin:text('labels_origin').notNull().default('manual'), abstract:text('abstract').notNull().default(''),
  provenance:text('provenance').notNull().default('{}'), listed:integer('listed').notNull().default(1),
  location_locked:integer('location_locked').notNull().default(1), analyzed_version:integer('analyzed_version').notNull().default(0),
});
export const nodeLabels=sqliteTable('node_labels',{
  node_id:text('node_id').notNull().references(()=>nodes.id),label:text('label').notNull(),
},t=>[uniqueIndex('labels_node_label').on(t.node_id,t.label),index('labels_label_node').on(t.label,t.node_id)]);
export const edgeDetails=sqliteTable('edge_details',{
  edge_id:text('edge_id').primaryKey().references(()=>edges.id),origin:text('origin').notNull().default('manual'),rationale:text('rationale').notNull().default(''),
});
export const attachments=sqliteTable('attachments',{
  id:text('id').primaryKey(),node_id:text('node_id').notNull().references(()=>nodes.id),name:text('name').notNull(),path:text('path').notNull().default(''),
  mime:text('mime').notNull(),size:integer('size').notNull(),created_at:text('created_at').notNull(),checksum:text('checksum').notNull().default(''),
},t=>[index('attachments_node_id').on(t.node_id,t.id)]);
export const transferBatches=sqliteTable('transfer_batches',{
  id:text('id').primaryKey(),checksum:text('checksum').notNull(),result:text('result').notNull(),created_at:text('created_at').notNull(),
});
export const organizationChanges=sqliteTable('organization_changes',{
  id:text('id').primaryKey(),node_id:text('node_id').notNull(),before:text('before').notNull(),after:text('after').notNull(),
  status:text('status').notNull().default('applied'),created_at:text('created_at').notNull(),
},t=>[index('organization_changes_created_id').on(t.created_at,t.id)]);
export const exportSessions=sqliteTable('export_sessions',{
  id:text('id').primaryKey(),revision:integer('revision').notNull(),scope:text('scope').notNull(),status:text('status').notNull(),created_at:text('created_at').notNull(),
});
export const exportMembers=sqliteTable('export_members',{
  session_id:text('session_id').notNull(),node_id:text('node_id').notNull(),expanded:integer('expanded').notNull().default(0),
},t=>[uniqueIndex('export_members_session_node').on(t.session_id,t.node_id),index('export_members_pending').on(t.session_id,t.expanded,t.node_id)]);
export const analysisQueue=sqliteTable('analysis_queue',{
  node_id:text('node_id').primaryKey(),version:integer('version').notNull(),lease_until:integer('lease_until').notNull().default(0),token:text('token').notNull().default(''),
},t=>[index('analysis_queue_lease_node').on(t.lease_until,t.node_id)]);
