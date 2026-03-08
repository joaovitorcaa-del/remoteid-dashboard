CREATE TABLE `activityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueKey` varchar(50) NOT NULL,
	`fromStatus` varchar(100),
	`toStatus` varchar(100),
	`changedBy` varchar(255),
	`changedAt` timestamp NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailySnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` int NOT NULL,
	`snapshotDate` date NOT NULL,
	`totalSp` int,
	`completedSp` int,
	`inProgressSp` int,
	`blockedCount` int,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailySnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `impediments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`issueKey` varchar(50) NOT NULL,
	`issueSummary` text,
	`blockedSince` date NOT NULL,
	`reason` varchar(255),
	`impactSp` int,
	`resolvedAt` timestamp,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `impediments_id` PRIMARY KEY(`id`)
);
