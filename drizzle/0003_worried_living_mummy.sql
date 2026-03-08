CREATE TABLE `jqlFilters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`jql` text NOT NULL,
	`descricao` text,
	`ativo` int NOT NULL DEFAULT 1,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jqlFilters_id` PRIMARY KEY(`id`)
);
