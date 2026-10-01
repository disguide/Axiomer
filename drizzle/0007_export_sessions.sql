CREATE TABLE `export_members` (
	`session_id` text NOT NULL,
	`node_id` text NOT NULL,
	`expanded` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `export_members_session_node` ON `export_members` (`session_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `export_members_pending` ON `export_members` (`session_id`,`expanded`,`node_id`);--> statement-breakpoint
CREATE TABLE `export_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`scope` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
