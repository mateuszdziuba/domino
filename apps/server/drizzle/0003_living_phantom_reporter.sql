ALTER TABLE `campaigns` ADD `invite_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_invite_code_unique` ON `campaigns` (`invite_code`);