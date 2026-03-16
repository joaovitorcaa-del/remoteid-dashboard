CREATE TABLE `blockingPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`padraoNome` varchar(255) NOT NULL,
	`descricao` text,
	`frequencia` int NOT NULL DEFAULT 0,
	`impactoTotal` int DEFAULT 0,
	`ultimaOcorrencia` date,
	`status` enum('Ativo','Resolvido','Monitorando') NOT NULL DEFAULT 'Ativo',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blockingPatterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` int NOT NULL,
	`totalBugs` int NOT NULL DEFAULT 0,
	`bugsFixed` int NOT NULL DEFAULT 0,
	`bugsDeferred` int NOT NULL DEFAULT 0,
	`testCoverage` int DEFAULT 0,
	`defectDensity` int DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qualityMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retroActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`responsavel` varchar(255),
	`status` enum('Aberta','Em Progresso','Concluída','Cancelada') NOT NULL DEFAULT 'Aberta',
	`prioridade` enum('Baixa','Média','Alta') NOT NULL DEFAULT 'Média',
	`dataVencimento` date,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retroActions_id` PRIMARY KEY(`id`)
);
