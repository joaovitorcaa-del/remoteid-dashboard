import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, InsertRetroAction, retroActions, RetroAction, InsertQualityMetric, qualityMetrics, QualityMetric, InsertBlockingPattern, blockingPatterns, BlockingPattern, InsertDailySnapshot, dailySnapshots, DailySnapshot, InsertActivityLogEntry, activityLog, ActivityLogEntry, InsertImpediment, impediments, Impediment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import { jqlFilters, InsertJqlFilter, JqlFilter } from "../drizzle/schema";

export async function createJqlFilter(filter: InsertJqlFilter): Promise<JqlFilter> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(jqlFilters).values(filter);
  const id = result[0].insertId;
  
  const created = await db.select().from(jqlFilters).where(eq(jqlFilters.id, Number(id))).limit(1);
  return created[0];
}

export async function getJqlFiltersByUserId(userId: number): Promise<JqlFilter[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(jqlFilters).where(eq(jqlFilters.userId, userId));
}

export async function getJqlFilterById(id: number): Promise<JqlFilter | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(jqlFilters).where(eq(jqlFilters.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateJqlFilter(id: number, updates: Partial<InsertJqlFilter>): Promise<JqlFilter | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  await db.update(jqlFilters).set(updates).where(eq(jqlFilters.id, id));
  
  const updated = await db.select().from(jqlFilters).where(eq(jqlFilters.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteJqlFilter(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  await db.delete(jqlFilters).where(eq(jqlFilters.id, id));
  return true;
}


// ============================================
// DAILY FEATURES - Impediments, Snapshots, Activity
// ============================================

import { and, isNull, desc, gte, lte } from "drizzle-orm";

// Impediments CRUD
export async function createImpediment(impediment: InsertImpediment): Promise<Impediment> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(impediments).values(impediment);
  const id = result[0].insertId;
  
  const created = await db.select().from(impediments).where(eq(impediments.id, Number(id))).limit(1);
  return created[0];
}

export async function getActiveImpediments(): Promise<Impediment[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(impediments).where(isNull(impediments.resolvedAt));
}

export async function getImpedimentById(id: number): Promise<Impediment | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(impediments).where(eq(impediments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateImpediment(id: number, updates: Partial<InsertImpediment>): Promise<Impediment | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  await db.update(impediments).set(updates).where(eq(impediments.id, id));
  
  const updated = await db.select().from(impediments).where(eq(impediments.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function resolveImpediment(id: number): Promise<Impediment | undefined> {
  return updateImpediment(id, { resolvedAt: new Date() });
}

export async function deleteImpediment(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  await db.delete(impediments).where(eq(impediments.id, id));
  return true;
}

// Daily Snapshots CRUD
export async function createDailySnapshot(snapshot: InsertDailySnapshot): Promise<DailySnapshot> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(dailySnapshots).values(snapshot);
  const id = result[0].insertId;
  
  const created = await db.select().from(dailySnapshots).where(eq(dailySnapshots.id, Number(id))).limit(1);
  return created[0];
}

export async function getDailySnapshotsBySprintId(sprintId: number): Promise<DailySnapshot[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(dailySnapshots).where(eq(dailySnapshots.sprintId, sprintId));
}

export async function getLatestDailySnapshot(sprintId: number): Promise<DailySnapshot | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select()
    .from(dailySnapshots)
    .where(eq(dailySnapshots.sprintId, sprintId))
    .orderBy(desc(dailySnapshots.snapshotDate))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Activity Log CRUD
export async function createActivityLogEntry(entry: InsertActivityLogEntry): Promise<ActivityLogEntry> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(activityLog).values(entry);
  const id = result[0].insertId;
  
  const created = await db.select().from(activityLog).where(eq(activityLog.id, Number(id))).limit(1);
  return created[0];
}

export async function getRecentActivity(hoursBack: number = 24): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - hoursBack);

  return await db.select()
    .from(activityLog)
    .where(gte(activityLog.changedAt, sinceDate))
    .orderBy(desc(activityLog.changedAt));
}

export async function getActivityByIssueKey(issueKey: string): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select()
    .from(activityLog)
    .where(eq(activityLog.issueKey, issueKey))
    .orderBy(desc(activityLog.changedAt));
}


// Retro Actions CRUD
export async function createRetroAction(action: InsertRetroAction): Promise<RetroAction> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(retroActions).values(action);
  const id = result[0].insertId;
  
  const created = await db.select().from(retroActions).where(eq(retroActions.id, Number(id))).limit(1);
  return created[0];
}

export async function getRetroActionsBySprintId(sprintId: number): Promise<RetroAction[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(retroActions).where(eq(retroActions.sprintId, sprintId)).orderBy(desc(retroActions.criadoEm));
}

export async function updateRetroAction(id: number, updates: Partial<InsertRetroAction>): Promise<RetroAction | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  await db.update(retroActions).set(updates).where(eq(retroActions.id, id));
  
  const updated = await db.select().from(retroActions).where(eq(retroActions.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteRetroAction(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  await db.delete(retroActions).where(eq(retroActions.id, id));
  return true;
}

// Quality Metrics CRUD
export async function createQualityMetric(metric: InsertQualityMetric): Promise<QualityMetric> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(qualityMetrics).values(metric);
  const id = result[0].insertId;
  
  const created = await db.select().from(qualityMetrics).where(eq(qualityMetrics.id, Number(id))).limit(1);
  return created[0];
}

export async function getQualityMetricsBySprintId(sprintId: number): Promise<QualityMetric | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(qualityMetrics).where(eq(qualityMetrics.sprintId, sprintId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateQualityMetric(id: number, updates: Partial<InsertQualityMetric>): Promise<QualityMetric | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  await db.update(qualityMetrics).set(updates).where(eq(qualityMetrics.id, id));
  
  const updated = await db.select().from(qualityMetrics).where(eq(qualityMetrics.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

// Blocking Patterns CRUD
export async function createBlockingPattern(pattern: InsertBlockingPattern): Promise<BlockingPattern> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(blockingPatterns).values(pattern);
  const id = result[0].insertId;
  
  const created = await db.select().from(blockingPatterns).where(eq(blockingPatterns.id, Number(id))).limit(1);
  return created[0];
}

export async function getBlockingPatterns(): Promise<BlockingPattern[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(blockingPatterns).orderBy(desc(blockingPatterns.frequencia));
}

export async function updateBlockingPattern(id: number, updates: Partial<InsertBlockingPattern>): Promise<BlockingPattern | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  await db.update(blockingPatterns).set(updates).where(eq(blockingPatterns.id, id));
  
  const updated = await db.select().from(blockingPatterns).where(eq(blockingPatterns.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}
