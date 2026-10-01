CREATE TABLE `analysis_queue` (
	`node_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`token` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analysis_queue_lease_node` ON `analysis_queue` (`lease_until`,`node_id`);--> statement-breakpoint
ALTER TABLE `attachments` ADD `checksum` text DEFAULT '' NOT NULL;