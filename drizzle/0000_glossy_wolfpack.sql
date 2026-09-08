CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`parent` text NOT NULL,
	`child` text NOT NULL,
	`relation` text NOT NULL,
	FOREIGN KEY (`parent`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edges_parent_child_relation` ON `edges` (`parent`,`child`,`relation`);--> statement-breakpoint
CREATE INDEX `edges_parent_id` ON `edges` (`parent`,`id`);--> statement-breakpoint
CREATE INDEX `edges_child_id` ON `edges` (`child`,`id`);--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'claim' NOT NULL,
	`topic` text DEFAULT 'General' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`publisher` text DEFAULT '' NOT NULL,
	`locator` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nodes_topic_kind_id` ON `nodes` (`topic`,`kind`,`id`);--> statement-breakpoint
CREATE INDEX `nodes_kind_id` ON `nodes` (`kind`,`id`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`parent` text NOT NULL,
	`base_version` integer NOT NULL,
	`relation` text NOT NULL,
	`draft` text NOT NULL,
	`rationale` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`parent`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `proposals_status_id` ON `proposals` (`status`,`id`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `revisions_node_version` ON `revisions` (`node_id`,`version`);