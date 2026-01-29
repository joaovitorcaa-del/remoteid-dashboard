CREATE TABLE `sprintIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` int NOT NULL,
	`chave` varchar(50) NOT NULL,
	`resumo` text NOT NULL,
	`responsavel` varchar(255) NOT NULL,
	`storyPoints` int NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sprintIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date NOT NULL,
	`ativo` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sprints_id` PRIMARY KEY(`id`)
);
