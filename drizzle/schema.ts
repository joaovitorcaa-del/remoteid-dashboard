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
