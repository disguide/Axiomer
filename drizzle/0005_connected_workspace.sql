CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attachments_node_id` ON `attachments` (`node_id`,`id`);--> statement-breakpoint
CREATE TABLE `edge_details` (
	`edge_id` text PRIMARY KEY NOT NULL,
	`origin` text DEFAULT 'manual' NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`edge_id`) REFERENCES `edges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `node_details` (
	`node_id` text PRIMARY KEY NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`labels_origin` text DEFAULT 'manual' NOT NULL,
	`abstract` text DEFAULT '' NOT NULL,
	`provenance` text DEFAULT '{}' NOT NULL,
	`listed` integer DEFAULT 1 NOT NULL,
	`location_locked` integer DEFAULT 1 NOT NULL,
	`analyzed_version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `node_labels` (
	`node_id` text NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_node_label` ON `node_labels` (`node_id`,`label`);--> statement-breakpoint
CREATE INDEX `labels_label_node` ON `node_labels` (`label`,`node_id`);--> statement-breakpoint
CREATE TABLE `organization_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `organization_changes_created_id` ON `organization_changes` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `transfer_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`checksum` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
