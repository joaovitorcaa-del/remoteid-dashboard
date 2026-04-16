import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { dailyMeetings, dailyDevTurns } from "../../drizzle/schema";

// ─── JIRA helpers ────────────────────────────────────────────────────────────

// In-memory cache for JIRA issues (5 min TTL)
const jiraCache = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchJiraIssuesByAssignee(jiraUsername: string): Promise<any[]> {
  const cacheKey = `assignee:${jiraUsername}`;
  const cached = jiraCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;
  const url = process.env.JIRA_URL;

  if (!token || !email || !url) {
    throw new Error("JIRA credentials not configured");
  }

  const jql = `assignee = "${jiraUsername}" AND sprint in openSprints() ORDER BY updated DESC`;
  const fields = "key,summary,status,assignee,priority,updated";
  const searchUrl = `${url}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=${fields}`;

  const response = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`JIRA API error: ${response.status} ${response.statusText} - ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  const issues = (data.issues || []).map((i: any) => ({
    key: i.key,
    summary: i.fields?.summary || "",
    status: i.fields?.status?.name || "",
    priority: i.fields?.priority?.name || "Medium",
    assignee: i.fields?.assignee?.displayName || jiraUsername,
    updated: i.fields?.updated || "",
  }));

  jiraCache.set(cacheKey, { data: issues, fetchedAt: Date.now() });
  return issues;
}

async function fetchSprintStats(jql: string): Promise<{
  total_issues: number;
  completed: number;
  in_progress: number;
  todo: number;
  completion_percentage: number;
  blockers: Array<{ key: string; assignee: string; days_blocked: number }>;
}> {
  const cacheKey = `sprint_stats:${jql}`;
  const cached = jiraCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;
  const url = process.env.JIRA_URL;

  if (!token || !email || !url) {
    throw new Error("JIRA credentials not configured");
  }

  const fields = "key,summary,status,assignee,priority,updated,flagged";
  const searchUrl = `${url}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=200&fields=${fields}`;

  const response = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`JIRA API error: ${response.status} ${response.statusText} - ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  const issues = data.issues || [];

  const doneStatuses = ["done", "concluído", "concluida", "closed", "resolved", "cancelled", "cancelado"];
  const inProgressStatuses = ["in progress", "em progresso", "code doing", "code review", "test doing", "staging", "dev doing"];

  let completed = 0;
  let inProgress = 0;
  let todo = 0;
  const blockers: Array<{ key: string; assignee: string; days_blocked: number }> = [];

  for (const issue of issues) {
    const statusName = (issue.fields?.status?.name || "").toLowerCase();
    if (doneStatuses.some(s => statusName.includes(s))) {
      completed++;
    } else if (inProgressStatuses.some(s => statusName.includes(s))) {
      inProgress++;
      // Check if it's been in progress for more than 3 days (potential blocker)
      const updatedAt = issue.fields?.updated ? new Date(issue.fields.updated) : null;
      if (updatedAt) {
        const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
        if (daysSinceUpdate >= 3) {
          blockers.push({
            key: issue.key,
            assignee: issue.fields?.assignee?.displayName || "Sem Assignee",
            days_blocked: daysSinceUpdate,
          });
        }
      }
    } else {
      todo++;
    }
  }

  const total = issues.length;
  const result = {
    total_issues: total,
    completed,
    in_progress: inProgress,
    todo,
    completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    blockers: blockers.sort((a, b) => b.days_blocked - a.days_blocked).slice(0, 10),
  };

  jiraCache.set(cacheKey, { data: result, fetchedAt: Date.now() });
  return result;
}

// ─── Markdown ata generator ──────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

function formatDatePtBR(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function generateMinutesMarkdown(meeting: any, turns: any[]): string {
  const dateStr = meeting.meetingDate
    ? formatDatePtBR(meeting.meetingDate)
    : new Date().toLocaleDateString("pt-BR");

  let md = `# Daily Scrum - ${dateStr}\n\n`;
  md += `**Duração:** ${formatDuration(meeting.durationSeconds || 0)}\n`;
  md += `**Participantes:** ${turns.length}/${meeting.totalDevs || turns.length} desenvolvedores\n\n`;
  md += `---\n\n`;

  for (const turn of turns) {
    md += `## ${turn.devName}\n`;
    if (turn.durationSeconds) {
      md += `**Duração:** ${formatDuration(turn.durationSeconds)}\n`;
    }

    const issueList = turn.issues && Array.isArray(turn.issues) ? turn.issues : [];
    if (issueList.length > 0) {
      md += `**Issues:** ${issueList.join(", ")}\n\n`;
    } else {
      md += "\n";
    }

    if (turn.completedTasks) md += `✅ **Concluiu tarefas**\n`;
    if (turn.hasWorkInProgress) md += `🔄 **Trabalho em progresso**\n`;
    if (turn.willStartNewTask) md += `🚀 **Vai iniciar nova tarefa**\n`;
    if (turn.hasBlockers) md += `🚫 **Tem impedimento**\n`;

    if (turn.summary) {
      md += `\n**Resumo:**\n${turn.summary}\n\n`;
    }

    if ((turn.hasBlockers || turn.hasImpediment) && turn.blockersDescription) {
      md += `**Impedimentos:**\n${turn.blockersDescription}\n\n`;
    } else if ((turn.hasBlockers || turn.hasImpediment) && turn.impedimentComment) {
      md += `**Impedimentos:**\n${turn.impedimentComment}\n\n`;
    }

    md += `---\n\n`;
  }

  // Blockers section
  const blockerTurns = turns.filter(t => t.hasBlockers || t.hasImpediment);
  if (blockerTurns.length > 0) {
    md += `## 🚨 Bloqueios e Impedimentos\n\n`;
    blockerTurns.forEach((b, i) => {
      md += `${i + 1}. **${b.devName}**\n`;
      const desc = b.blockersDescription || b.impedimentComment || "";
      if (desc) md += `   ${desc}\n\n`;
    });
    md += `---\n\n`;
  }

  // Stats
  const issuesMentioned = turns.reduce((acc, t) => {
    const list = t.issues && Array.isArray(t.issues) ? t.issues : [];
    return acc + list.length;
  }, 0);

  md += `## 📊 Estatísticas\n\n`;
  md += `- **Issues mencionadas:** ${issuesMentioned}\n`;
  md += `- **Bloqueios ativos:** ${blockerTurns.length}\n`;
  md += `- **Participantes:** ${turns.length}\n`;

  if (meeting.durationSeconds && turns.length > 0) {
    const avgSec = Math.round(meeting.durationSeconds / turns.length);
    md += `- **Média de tempo por dev:** ${formatDuration(avgSec)}\n`;
  }

  md += `\n---\n\n`;
  md += `**Gerado automaticamente em:** ${new Date().toLocaleString("pt-BR")}\n`;

  return md;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const dailyMeetingRouter = router({
  /**
   * Create a new daily meeting
   */
  createMeeting: protectedProcedure
    .input(z.object({
      jqlUsed: z.string().optional(),
      totalDevs: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const todayDate = new Date();

      const result = await db.insert(dailyMeetings).values({
        meetingDate: todayDate,
        jqlUsed: input.jqlUsed ?? null,
        totalDevs: input.totalDevs,
        registeredDevs: 0,
        silentDevs: [],
        status: "in_progress",
        createdBy: ctx.user.id,
      });

      const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { meetingId: Number(insertId) };
    }),

  /**
   * Get a meeting by ID with all turns
   */
  getMeeting: protectedProcedure
    .input(z.object({ meetingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const meetings = await db
        .select()
        .from(dailyMeetings)
        .where(eq(dailyMeetings.id, input.meetingId))
        .limit(1);

      if (meetings.length === 0) return null;
      const meeting = meetings[0];

      const turns = await db
        .select()
        .from(dailyDevTurns)
        .where(eq(dailyDevTurns.meetingId, input.meetingId))
        .orderBy(dailyDevTurns.turnOrder);

      return { meeting, turns };
    }),

  /**
   * List all completed meetings (paginated)
   */
  listMeetings: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
      status: z.enum(["in_progress", "concluded", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { meetings: [], total: 0, hasMore: false };

      let query = db.select().from(dailyMeetings);
      if (input.status !== "all") {
        query = query.where(eq(dailyMeetings.status, input.status)) as any;
      }

      const meetings = await (query as any)
        .orderBy(desc(dailyMeetings.meetingDate))
        .limit(input.limit)
        .offset(input.offset);

      // Count total
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(dailyMeetings);
      const total = Number(countResult[0]?.count || 0);

      return {
        meetings,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Save a dev turn during a meeting
   */
  saveTurn: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      devName: z.string(),
      devId: z.string().optional(),
      jiraUsername: z.string().optional(),
      turnOrder: z.number(),
      startedAt: z.string().optional(), // ISO string
      finishedAt: z.string().optional(), // ISO string
      durationSeconds: z.number().default(0),
      issues: z.array(z.string()).default([]),
      completedTasks: z.boolean().default(false),
      hasWorkInProgress: z.boolean().default(false),
      willStartNewTask: z.boolean().default(false),
      hasBlockers: z.boolean().default(false),
      summary: z.string(),
      blockersDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Validate
      if (!input.summary.trim()) {
        throw new Error("O resumo é obrigatório");
      }
      if (input.hasBlockers && !input.blockersDescription?.trim()) {
        throw new Error("Descreva o impedimento quando marcado");
      }
      const hasAnyStatus = input.completedTasks || input.hasWorkInProgress || input.willStartNewTask || input.hasBlockers;
      if (!hasAnyStatus) {
        throw new Error("Selecione ao menos um status (concluiu, em progresso, vai iniciar ou tem impedimento)");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(dailyDevTurns).values({
        meetingId: input.meetingId,
        devName: input.devName,
        devId: input.devId ?? null,
        jiraUsername: input.jiraUsername ?? null,
        turnOrder: input.turnOrder,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
        durationSeconds: input.durationSeconds,
        issues: input.issues,
        completedTasks: input.completedTasks ? 1 : 0,
        hasWorkInProgress: input.hasWorkInProgress ? 1 : 0,
        willStartNewTask: input.willStartNewTask ? 1 : 0,
        hasBlockers: input.hasBlockers ? 1 : 0,
        summary: input.summary,
        blockersDescription: input.blockersDescription ?? null,
        hasImpediment: input.hasBlockers ? 1 : 0,
        registered: 1,
      });

      const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { turnId: Number(insertId) };
    }),

  /**
   * Conclude a meeting
   */
  concludeMeeting: protectedProcedure
    .input(z.object({
      meetingId: z.number(),
      durationSeconds: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Count registered turns
      const turns = await db
        .select()
        .from(dailyDevTurns)
        .where(eq(dailyDevTurns.meetingId, input.meetingId));

      await db
        .update(dailyMeetings)
        .set({
          status: "concluded",
          durationSeconds: input.durationSeconds,
          registeredDevs: turns.length,
          updatedAt: new Date(),
        })
        .where(eq(dailyMeetings.id, input.meetingId));

      return { success: true };
    }),

  /**
   * Generate meeting minutes in Markdown
   */
  getMinutes: protectedProcedure
    .input(z.object({ meetingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { markdown: "" };

      const meetings = await db
        .select()
        .from(dailyMeetings)
        .where(eq(dailyMeetings.id, input.meetingId))
        .limit(1);

      if (meetings.length === 0) return { markdown: "" };

      const turns = await db
        .select()
        .from(dailyDevTurns)
        .where(eq(dailyDevTurns.meetingId, input.meetingId))
        .orderBy(dailyDevTurns.turnOrder);

      const markdown = generateMinutesMarkdown(meetings[0], turns);
      return { markdown };
    }),

  /**
   * Get JIRA issues for a specific assignee (with 5-min cache)
   */
  getIssuesByAssignee: protectedProcedure
    .input(z.object({
      jiraUsername: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const issues = await fetchJiraIssuesByAssignee(input.jiraUsername);
        return { issues, fromCache: false };
      } catch (err: any) {
        console.error("[dailyMeeting] Failed to fetch JIRA issues:", err.message);
        // Return empty list but don't block the daily
        return { issues: [], fromCache: false, error: err.message };
      }
    }),

  /**
   * Get sprint statistics from JIRA
   */
  getSprintStats: protectedProcedure
    .input(z.object({
      jql: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const stats = await fetchSprintStats(input.jql);
        return { ...stats, fromCache: false };
      } catch (err: any) {
        console.error("[dailyMeeting] Failed to fetch sprint stats:", err.message);
        return {
          total_issues: 0,
          completed: 0,
          in_progress: 0,
          todo: 0,
          completion_percentage: 0,
          blockers: [],
          fromCache: false,
          error: err.message,
        };
      }
    }),

  /**
   * Force refresh JIRA cache
   */
  refreshCache: protectedProcedure
    .mutation(async () => {
      jiraCache.clear();
      return { success: true };
    }),

  /**
   * Get today's meeting (if any)
   */
  getTodayMeeting: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;

      const today = new Date().toISOString().split("T")[0];
      const meetings = await db
        .select()
        .from(dailyMeetings)
        .where(sql`DATE(${dailyMeetings.meetingDate}) = ${today}`)
        .orderBy(desc(dailyMeetings.createdAt))
        .limit(1);

      if (meetings.length === 0) return null;
      const meeting = meetings[0];
      const turns = await db
        .select()
        .from(dailyDevTurns)
        .where(eq(dailyDevTurns.meetingId, meeting.id))
        .orderBy(dailyDevTurns.turnOrder);

      return { meeting, turns };
    }),
});
