CREATE TABLE `completion_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participationHash` varchar(64) NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`status` enum('issued','redeemed','expired') NOT NULL DEFAULT 'issued',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`redeemedAt` timestamp,
	CONSTRAINT `completion_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `completion_codes_participationHash_unique` UNIQUE(`participationHash`),
	CONSTRAINT `completion_codes_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
