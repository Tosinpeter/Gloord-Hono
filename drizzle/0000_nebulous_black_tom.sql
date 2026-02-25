CREATE TABLE `profiles` (
	`id` integer NOT NULL,
	`fullname` text NOT NULL,
	`age` text NOT NULL,
	`gender` text NOT NULL,
	`skin_type` text NOT NULL,
	`skin_sensitivity` text NOT NULL,
	`skin_concerns` text NOT NULL,
	`health_conditions` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_id_unique` ON `profiles` (`id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_unique` ON `users` (`phone_number`);