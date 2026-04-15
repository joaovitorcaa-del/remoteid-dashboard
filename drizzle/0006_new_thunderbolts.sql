CREATE TABLE `analysisIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueKey` varchar(50) NOT NULL,
	`summary` text,
	`issueType` varchar(100),
	`status` varchar(100),
	`priority` varchar(50),
	`assignee` varchar(255),
	`reporter` varchar(255),
	`project` varchar(100),
	`storyPoints` decimal(10,2),
	`sprintName` varchar(255),
	`sprintState` varchar(50),
	`labels` text,
	`components` text,
	`resolution` varchar(100),
	`createdAt` timestamp,
	`updatedAt` timestamp,
	`resolvedAt` timestamp,
	`statusChangedAt` timestamp,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`jqlSource` text,
	CONSTRAINT `analysisIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysisSyncLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jql` text NOT NULL,
	`totalIssues` int NOT NULL DEFAULT 0,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`durationMs` int,
	CONSTRAINT `analysisSyncLog_id` PRIMARY KEY(`id`)
);
