CREATE TABLE `custom_items` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` real,
	`price_gp` integer NOT NULL,
	`category` text DEFAULT 'magic' NOT NULL,
	`slot` text,
	`icon` text DEFAULT 'Package' NOT NULL,
	`attuned` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `notes` text;