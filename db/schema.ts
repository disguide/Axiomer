import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
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
