import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal, json } from "drizzle-orm/mysql-core";

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

// Daily Snapshots - snapshots diários do dashboard
export const dailySnapshots = mysqlTable("dailySnapshots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sprintId: int("sprintId"),
  snapshotDate: date("snapshotDate").notNull(),
  metricsJson: json("metricsJson").$type<{
    completionRate: { yesterday: number; today: number; delta: number };
    changes: { yesterday: number; today: number; delta: number };
    overdue: { yesterday: number; today: number; delta: number };
    blockers: { yesterday: number; today: number; delta: number };
  }>(),
  devsData: json("devsData").$type<any>(),
  issuesCritical: json("issuesCritical").$type<any>(),
  notes: text("notes"),
  manualUpdates: json("manualUpdates").$type<any>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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

// Analysis Issues - issues do JIRA persistidas para análise offline
export const analysisIssues = mysqlTable("analysisIssues", {
  id: int("id").autoincrement().primaryKey(),
  issueKey: varchar("issueKey", { length: 50 }).notNull(),
  summary: text("summary"),
  issueType: varchar("issueType", { length: 100 }),
  status: varchar("status", { length: 100 }),
  priority: varchar("priority", { length: 50 }),
  assignee: varchar("assignee", { length: 255 }),
  reporter: varchar("reporter", { length: 255 }),
  project: varchar("project", { length: 100 }),
  storyPoints: decimal("storyPoints", { precision: 10, scale: 2 }),
  sprintName: varchar("sprintName", { length: 255 }),
  sprintState: varchar("sprintState", { length: 50 }),
  sprintStartDate: timestamp("sprintStartDate"),
  sprintEndDate: timestamp("sprintEndDate"),
  labels: text("labels"), // JSON array
  components: text("components"), // JSON array
  resolution: varchar("resolution", { length: 100 }),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  resolvedAt: timestamp("resolvedAt"),
  statusChangedAt: timestamp("statusChangedAt"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  jqlSource: text("jqlSource"), // JQL que originou este registro
});

export type AnalysisIssue = typeof analysisIssues.$inferSelect;
export type InsertAnalysisIssue = typeof analysisIssues.$inferInsert;

// Analysis Sync Log - registro de sincronizações
export const analysisSyncLog = mysqlTable("analysisSyncLog", {
  id: int("id").autoincrement().primaryKey(),
  jql: text("jql").notNull(),
  totalIssues: int("totalIssues").default(0).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  durationMs: int("durationMs"),
});

export type AnalysisSyncLog = typeof analysisSyncLog.$inferSelect;
export type InsertAnalysisSyncLog = typeof analysisSyncLog.$inferInsert;

// Daily Meetings - registro de cada reunião diária
export const dailyMeetings = mysqlTable("dailyMeetings", {
  id: int("id").autoincrement().primaryKey(),
  meetingDate: date("meetingDate").notNull(),
  jqlUsed: text("jqlUsed"),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  totalDevs: int("totalDevs").default(0).notNull(),
  registeredDevs: int("registeredDevs").default(0).notNull(),
  silentDevs: json("silentDevs").$type<string[]>().default([]),
  aiReport: text("aiReport"),
  metricsSnapshot: json("metricsSnapshot").$type<any>(),
  status: mysqlEnum("status", ["in_progress", "concluded"]).default("in_progress").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyMeeting = typeof dailyMeetings.$inferSelect;
export type InsertDailyMeeting = typeof dailyMeetings.$inferInsert;

// Daily Dev Turns - turnos individuais de cada desenvolvedor
export const dailyDevTurns = mysqlTable("dailyDevTurns", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  devName: varchar("devName", { length: 255 }).notNull(),
  devId: varchar("devId", { length: 255 }),
  jiraUsername: varchar("jiraUsername", { length: 100 }),
  turnOrder: int("turnOrder").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  durationSeconds: int("durationSeconds").default(0),
  // Issues trabalhadas (JSON array de strings)
  issues: json("issues").$type<string[]>().default([]),
  // Status rápido (checkboxes)
  completedTasks: int("completedTasks").default(0),
  hasWorkInProgress: int("hasWorkInProgress").default(0),
  willStartNewTask: int("willStartNewTask").default(0),
  hasBlockers: int("hasBlockers").default(0),
  // Textos livres
  summary: text("summary"),
  blockersDescription: text("blockersDescription"),
  // Legacy fields (kept for backward compat)
  currentTask: text("currentTask"),
  currentTaskComment: text("currentTaskComment"),
  nextTask: text("nextTask"),
  nextTaskComment: text("nextTaskComment"),
  hasImpediment: int("hasImpediment").default(0).notNull(),
  impedimentIssue: varchar("impedimentIssue", { length: 255 }),
  impedimentComment: text("impedimentComment"),
  issuesData: json("issuesData").$type<Array<{ key: string; title: string; status: string; lastUpdate: string }>>()
,  registered: int("registered").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyDevTurn = typeof dailyDevTurns.$inferSelect;
export type InsertDailyDevTurn = typeof dailyDevTurns.$inferInsert;

// Shared Links - links públicos para compartilhar snapshots
export const sharedLinks = mysqlTable("sharedLinks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  snapshotId: varchar("snapshotId", { length: 36 }).notNull(),
  publicToken: varchar("publicToken", { length: 36 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SharedLink = typeof sharedLinks.$inferSelect;
export type InsertSharedLink = typeof sharedLinks.$inferInsert;
