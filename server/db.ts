import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
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
