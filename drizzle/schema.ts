import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Sprints table for planning
export const sprints = mysqlTable("sprints", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  dataInicio: date("dataInicio").notNull(),
  dataFim: date("dataFim").notNull(),
  ativo: int("ativo").default(0).notNull(), // 0 = false, 1 = true
  status: mysqlEnum("status", ["ativa", "encerrada"]).default("ativa").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Sprint = typeof sprints.$inferSelect;
export type InsertSprint = typeof sprints.$inferInsert;

// Sprint Issues table - issues assigned to sprints
export const sprintIssues = mysqlTable("sprintIssues", {
  id: int("id").autoincrement().primaryKey(),
  sprintId: int("sprintId").notNull(),
  chave: varchar("chave", { length: 50 }).notNull(),
  resumo: text("resumo").notNull(),
  responsavel: varchar("responsavel", { length: 255 }).notNull(),
  storyPoints: int("storyPoints").notNull(),
  status: mysqlEnum("status", ["Ready to Sprint", "Dev to Do", "Code Doing", "Code Review", "Test to Do", "Test Doing", "Staging", "Done", "Cancelled"]).default("Ready to Sprint").notNull(),
  dataInicio: date("dataInicio").notNull(),
  dataFim: date("dataFim").notNull(),
  ordem: int("ordem").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type SprintIssue = typeof sprintIssues.$inferSelect;
export type InsertSprintIssue = typeof sprintIssues.$inferInsert;
// JQL Filters table for saving custom Jira queries
export const jqlFilters = mysqlTable("jqlFilters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  jql: text("jql").notNull(),
  descricao: text("descricao"),
  ativo: int("ativo").default(1).notNull(), // 0 = false, 1 = true
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type JqlFilter = typeof jqlFilters.$inferSelect;
export type InsertJqlFilter = typeof jqlFilters.$inferInsert;

// Daily Snapshots - for tracking daily metrics
export const dailySnapshots = mysqlTable("dailySnapshots", {
  id: int("id").autoincrement().primaryKey(),
  sprintId: int("sprintId").notNull(),
  snapshotDate: date("snapshotDate").notNull(),
  totalSp: int("totalSp"),
  completedSp: int("completedSp"),
  inProgressSp: int("inProgressSp"),
  blockedCount: int("blockedCount"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type InsertDailySnapshot = typeof dailySnapshots.$inferInsert;

// Impediments - for tracking blockers
export const impediments = mysqlTable("impediments", {
  id: int("id").autoincrement().primaryKey(),
  issueKey: varchar("issueKey", { length: 50 }).notNull(),
  issueSummary: text("issueSummary"),
  blockedSince: date("blockedSince").notNull(),
  reason: varchar("reason", { length: 255 }),
  impactSp: int("impactSp"),
  resolvedAt: timestamp("resolvedAt"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Impediment = typeof impediments.$inferSelect;
export type InsertImpediment = typeof impediments.$inferInsert;

// Activity Log - for tracking changes
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  issueKey: varchar("issueKey", { length: 50 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 100 }),
  toStatus: varchar("toStatus", { length: 100 }),
  changedBy: varchar("changedBy", { length: 255 }),
  changedAt: timestamp("changedAt").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;


// Retro Actions - for tracking retrospective action items
export const retroActions = mysqlTable("retroActions", {
  id: int("id").autoincrement().primaryKey(),
  sprintId: int("sprintId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  responsavel: varchar("responsavel", { length: 255 }),
  status: mysqlEnum("status", ["Aberta", "Em Progresso", "Concluída", "Cancelada"]).default("Aberta").notNull(),
  prioridade: mysqlEnum("prioridade", ["Baixa", "Média", "Alta"]).default("Média").notNull(),
  dataVencimento: date("dataVencimento"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type RetroAction = typeof retroActions.$inferSelect;
export type InsertRetroAction = typeof retroActions.$inferInsert;

// Quality Metrics - for tracking bugs and quality per sprint
export const qualityMetrics = mysqlTable("qualityMetrics", {
  id: int("id").autoincrement().primaryKey(),
  sprintId: int("sprintId").notNull(),
  totalBugs: int("totalBugs").default(0).notNull(),
  bugsFixed: int("bugsFixed").default(0).notNull(),
  bugsDeferred: int("bugsDeferred").default(0).notNull(),
  testCoverage: int("testCoverage").default(0), // percentage
  defectDensity: int("defectDensity").default(0), // bugs per 1000 lines
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type QualityMetric = typeof qualityMetrics.$inferSelect;
export type InsertQualityMetric = typeof qualityMetrics.$inferInsert;

// Blocking Patterns - for analyzing recurring blocker patterns
export const blockingPatterns = mysqlTable("blockingPatterns", {
  id: int("id").autoincrement().primaryKey(),
  padraoNome: varchar("padraoNome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  frequencia: int("frequencia").default(0).notNull(), // how many times occurred
  impactoTotal: int("impactoTotal").default(0), // total SP impacted
  ultimaOcorrencia: date("ultimaOcorrencia"),
  status: mysqlEnum("status", ["Ativo", "Resolvido", "Monitorando"]).default("Ativo").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type BlockingPattern = typeof blockingPatterns.$inferSelect;
export type InsertBlockingPattern = typeof blockingPatterns.$inferInsert;
