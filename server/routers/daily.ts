import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { getDb } from "../db";
import { dailySnapshots, sharedLinks } from "../../drizzle/schema";
import { randomUUID } from "crypto";
const uuidv4 = randomUUID;
import { invokeLLM } from "../_core/llm";

// Types for Daily Dashboard
interface DeveloperActivity {
  id: string;
  name: string;
  avatar: string;
  status: "active" | "inactive" | "critical";
  lastActivity: string;
  summary: {
    yesterday: { inProgress: number; done: number };
    today: { inProgress: number; done: number };
  };
  issues: Array<{
    key: string;
    title: string;
    status: string;
    lastUpdate: string;
  }>;
}

interface CriticalIssue {
  key: string;
  title: string;
  status: string;
  daysOverdue: number;
  assignee?: string;
}

interface ComparisonMetrics {
  completionRate: { yesterday: number; today: number; delta: number };
  changes: { yesterday: number; today: number; delta: number };
  overdue: { yesterday: number; today: number; delta: number };
  blockers: { yesterday: number; today: number; delta: number };
}

// Helper to fetch issues from JIRA
async function fetchJiraIssues(jql: string) {
  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;
  const url = process.env.JIRA_URL;

  if (!token || !email || !url) {
    console.error('[Daily] JIRA credentials missing:', { hasToken: !!token, hasEmail: !!email, hasUrl: !!url });
    throw new Error("JIRA credentials not configured");
  }

  try {
    console.log('[Daily] Fetching JIRA issues with JQL:', jql.substring(0, 100));
    
    const fields = "key,summary,status,assignee,updated,duedate,flagged,customfield_10004";
    const searchUrl = `${url}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=${fields}`;
    
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      console.error('[Daily] JIRA API error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorBody: errorBody.substring(0, 200),
      });
      throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Daily] JIRA fetch successful, issues found:', data.issues?.length || 0);
    return data;
  } catch (error) {
    console.error('[Daily] Error fetching JIRA issues:', error);
    throw error;
  }
}

// Helper to calculate time difference in human-readable format
function formatTimeDifference(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return "1 dia atrás";
  return `${days} dias atrás`;
}

// Helper to determine developer status
function getDeveloperStatus(lastActivityDate: Date): "active" | "inactive" | "critical" {
  const now = new Date();
  const hoursAgo = (now.getTime() - lastActivityDate.getTime()) / 3600000;

  if (hoursAgo < 24) return "active";
  if (hoursAgo < 72) return "inactive";
  return "critical";
}

export const dailyRouter = router({
  // Get recent activity (last 24 hours)
  getRecentActivity: protectedProcedure
    .input(z.object({ hoursBack: z.number().default(24) }))
    .query(async ({ input }) => {
      try {
        const jql = `project = "RemoteID" AND updated >= -${input.hoursBack}h ORDER BY updated DESC`;
        const data = await fetchJiraIssues(jql);

        return (data.issues || []).map((issue: any) => ({
          id: issue.key,
          issueKey: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name,
          assignee: issue.fields.assignee?.displayName,
          updated: issue.fields.updated,
          fromStatus: "In Progress", // Would need changelog parsing for real value
          toStatus: issue.fields.status?.name,
          changedBy: issue.fields.assignee?.displayName,
          changedAt: issue.fields.updated,
        }));
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
      }
    }),

  // Get active impediments/blockers
  getActiveImpediments: protectedProcedure.query(async () => {
    try {
      const jql = `project = "RemoteID" AND (labels = blocked OR flagged = Impediment) AND status != Done`;
      const data = await fetchJiraIssues(jql);

      return (data.issues || []).map((issue: any) => ({
        id: issue.key,
        issueKey: issue.key,
        issueSummary: issue.fields.summary,
        status: issue.fields.status?.name,
        blockedSince: issue.fields.created,
        reason: "Blocked", // Would need to extract from custom field
        impactSp: issue.fields.customfield_10004 || 0,
      }));
    } catch (error) {
      console.error("Error fetching impediments:", error);
      return [];
    }
  }),

  // Get daily dashboard data for a specific date
  getDailyData: protectedProcedure
    .input(z.object({ date: z.string().optional(), jql: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const targetDate = input.date ? new Date(input.date) : new Date();
        const yesterday = new Date(targetDate);
        yesterday.setDate(yesterday.getDate() - 1);

        // Use provided JQL or default to active sprint
        let jqlQuery = input.jql || `sprint in openSprints() ORDER BY updated DESC`;
        
        // Validate JQL is not empty
        if (!jqlQuery || jqlQuery.trim().length === 0) {
          console.warn('[Daily] JQL is empty, using default');
          jqlQuery = `sprint in openSprints() ORDER BY updated DESC`;
        }
        
        console.log('[Daily] getDailyData - Using JQL:', jqlQuery.substring(0, 150));
        const data = await fetchJiraIssues(jqlQuery);
        const issues = data.issues || [];
        console.log('[Daily] getDailyData - Got', issues.length, 'issues');

        // Calculate metrics
        const todayIssues = issues.filter((issue: any) => {
          const updated = new Date(issue.fields.updated);
          return updated >= targetDate;
        });

        const yesterdayIssues = issues.filter((issue: any) => {
          const updated = new Date(issue.fields.updated);
          return updated >= yesterday && updated < targetDate;
        });

        const completedToday = todayIssues.filter(
          (issue: any) => issue.fields.status?.name === "Done"
        ).length;
        const inProgressToday = todayIssues.filter(
          (issue: any) => issue.fields.status?.name !== "Done"
        ).length;

        const completedYesterday = yesterdayIssues.filter(
          (issue: any) => issue.fields.status?.name === "Done"
        ).length;
        const inProgressYesterday = yesterdayIssues.filter(
          (issue: any) => issue.fields.status?.name !== "Done"
        ).length;

        const completionRateToday =
          completedToday + inProgressToday > 0
            ? Math.round((completedToday / (completedToday + inProgressToday)) * 100)
            : 0;

        const completionRateYesterday =
          completedYesterday + inProgressYesterday > 0
            ? Math.round((completedYesterday / (completedYesterday + inProgressYesterday)) * 100)
            : 0;

        // Count overdue issues
        const overdueToday = issues.filter((issue: any) => {
          if (!issue.fields.duedate) return false;
          const dueDate = new Date(issue.fields.duedate);
          return dueDate < targetDate && issue.fields.status?.name !== "Done";
        }).length;

        const overdueYesterday = issues.filter((issue: any) => {
          if (!issue.fields.duedate) return false;
          const dueDate = new Date(issue.fields.duedate);
          return dueDate < yesterday && issue.fields.status?.name !== "Done";
        }).length;

        // Count blockers
        const blockersToday = issues.filter(
          (issue: any) =>
            issue.fields.flagged === true || (issue.fields.labels || []).includes("blocked")
        ).length;

        const blockersYesterday = blockersToday; // Simplified

        // Group issues by developer
        const developerMap = new Map<string, any[]>();
        issues.forEach((issue: any) => {
          const assignee = issue.fields.assignee?.displayName || "Sem Assignee";
          if (!developerMap.has(assignee)) {
            developerMap.set(assignee, []);
          }
          developerMap.get(assignee)!.push(issue);
        });

        const developers: DeveloperActivity[] = Array.from(developerMap.entries()).map(
          ([name, devIssues]) => {
            const lastActivity = new Date(
              Math.max(
                ...devIssues.map((issue: any) => new Date(issue.fields.updated).getTime())
              )
            );

            const todayDevIssues = devIssues.filter((issue: any) => {
              const updated = new Date(issue.fields.updated);
              return updated >= targetDate;
            });

            const yesterdayDevIssues = devIssues.filter((issue: any) => {
              const updated = new Date(issue.fields.updated);
              return updated >= yesterday && updated < targetDate;
            });

            return {
              id: name,
              name,
              avatar: name.substring(0, 2).toUpperCase(),
              status: getDeveloperStatus(lastActivity),
              lastActivity: formatTimeDifference(lastActivity),
              summary: {
                yesterday: {
                  inProgress: yesterdayDevIssues.filter(
                    (i: any) => i.fields.status?.name !== "Done"
                  ).length,
                  done: yesterdayDevIssues.filter((i: any) => i.fields.status?.name === "Done")
                    .length,
                },
                today: {
                  inProgress: todayDevIssues.filter((i: any) => i.fields.status?.name !== "Done")
                    .length,
                  done: todayDevIssues.filter((i: any) => i.fields.status?.name === "Done")
                    .length,
                },
              },
              issues: devIssues.slice(0, 3).map((issue: any) => ({
                key: issue.key,
                title: issue.fields.summary,
                status: issue.fields.status?.name,
                lastUpdate: formatTimeDifference(new Date(issue.fields.updated)),
              })),
            };
          }
        );

        // Get critical issues
        const criticalIssues: CriticalIssue[] = issues
          .filter((issue: any) => {
            const isBlocked = issue.fields.flagged === true || (issue.fields.labels || []).includes("blocked");
            const isOverdue =
              issue.fields.duedate &&
              new Date(issue.fields.duedate) < targetDate &&
              issue.fields.status?.name !== "Done";
            return isBlocked || isOverdue;
          })
          .map((issue: any) => {
            const daysOverdue = issue.fields.duedate
              ? Math.floor((targetDate.getTime() - new Date(issue.fields.duedate).getTime()) / 86400000)
              : 0;
            return {
              key: issue.key,
              title: issue.fields.summary,
              status: issue.fields.status?.name,
              daysOverdue,
              assignee: issue.fields.assignee?.displayName,
            };
          });

        const metrics: ComparisonMetrics = {
          completionRate: {
            yesterday: completionRateYesterday,
            today: completionRateToday,
            delta: completionRateToday - completionRateYesterday,
          },
          changes: {
            yesterday: yesterdayIssues.length,
            today: todayIssues.length,
            delta: todayIssues.length - yesterdayIssues.length,
          },
          overdue: {
            yesterday: overdueYesterday,
            today: overdueToday,
            delta: overdueToday - overdueYesterday,
          },
          blockers: {
            yesterday: blockersYesterday,
            today: blockersToday,
            delta: blockersToday - blockersYesterday,
          },
        };

        return {
          date: targetDate.toISOString().split("T")[0],
          metrics,
          developers,
          criticalIssues,
          issues,
        };
      } catch (error) {
        console.error("Error fetching daily data:", error);
        throw error;
      }
    }),

  // Save snapshot
  saveSnapshot: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        metricsJson: z.any(),
        devsData: z.any(),
        issuesCritical: z.any(),
        notes: z.string().optional(),
        manualUpdates: z.any().optional(),
        sprintId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const id = uuidv4();
      // Ensure date is in YYYY-MM-DD format for database
      const dateObj = new Date(input.date);
      const snapshotDate = dateObj.toISOString().split('T')[0];

      await db.insert(dailySnapshots).values({
        id,
        sprintId: input.sprintId,
        snapshotDate: new Date(snapshotDate),
        metricsJson: input.metricsJson,
        devsData: input.devsData,
        issuesCritical: input.issuesCritical,
        notes: input.notes,
        manualUpdates: input.manualUpdates,
      });

      return { id, success: true };
    }),

  // Get snapshot for a date
  getSnapshot: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      try {
        // Ensure date is in YYYY-MM-DD format
        let snapshotDate: string;
        if (input.date.includes('T')) {
          // If ISO string, extract date part
          snapshotDate = input.date.split('T')[0];
        } else if (input.date.length === 10) {
          // Already in YYYY-MM-DD format
          snapshotDate = input.date;
        } else {
          // Parse as date and format
          const dateObj = new Date(input.date);
          snapshotDate = dateObj.toISOString().split('T')[0];
        }
        
        console.log('[Daily] getSnapshot - searching for date:', snapshotDate);
        
        const result = await db
          .select()
          .from(dailySnapshots)
          .where(eq(dailySnapshots.snapshotDate, new Date(snapshotDate)))
          .limit(1);

        console.log('[Daily] getSnapshot - found:', result.length > 0 ? 'yes' : 'no');
        return result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error('[Daily] getSnapshot error:', error, 'input:', input.date);
        throw error;
      }
    }),

  // Create shared link
  createSharedLink: protectedProcedure
    .input(z.object({ snapshotId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const publicToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const id = uuidv4();
      await db.insert(sharedLinks).values({
        id,
        snapshotId: input.snapshotId,
        publicToken,
        expiresAt,
      });

      return {
        token: publicToken,
        url: `/d/${publicToken}`,
        expiresAt,
      };
    }),

  // Get shared snapshot
  getSharedSnapshot: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      const link = await db
        .select()
        .from(sharedLinks)
        .where(eq(sharedLinks.publicToken, input.token))
        .limit(1);

      if (link.length === 0 || new Date(link[0].expiresAt) < new Date()) {
        return null;
      }

      const snapshot = await db
        .select()
        .from(dailySnapshots)
        .where(eq(dailySnapshots.id, link[0].snapshotId))
        .limit(1);

      return snapshot.length > 0 ? snapshot[0] : null;
    }),

  // Generate AI summary
  generateSummary: protectedProcedure
    .input(z.object({ metrics: z.any() }))
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente que gera resumos executivos de daily standups. Seja conciso, profissional e focado em insights acionáveis.",
            },
            {
              role: "user",
              content: `Gere um resumo de 1-2 frases sobre o seguinte daily dashboard:
              
Taxa de Conclusão: ${input.metrics.completionRate.yesterday}% → ${input.metrics.completionRate.today}% (${input.metrics.completionRate.delta > 0 ? "↑" : "↓"} ${Math.abs(input.metrics.completionRate.delta)}%)
Mudanças: ${input.metrics.changes.yesterday} → ${input.metrics.changes.today} (${input.metrics.changes.delta > 0 ? "+" : ""}${input.metrics.changes.delta})
Issues Atrasadas: ${input.metrics.overdue.yesterday} → ${input.metrics.overdue.today} (${input.metrics.overdue.delta > 0 ? "+" : ""}${input.metrics.overdue.delta})
Bloqueadores: ${input.metrics.blockers.yesterday} → ${input.metrics.blockers.today} (${input.metrics.blockers.delta > 0 ? "+" : ""}${input.metrics.blockers.delta})`,
            },
          ],
        });

        return response.choices[0].message.content;
      } catch (error) {
        console.error("Error generating summary:", error);
        return null;
      }
    }),

  // Generate full daily report with AI analysis
  generateDailyReport: protectedProcedure
    .input(z.object({
      devTurns: z.array(z.object({
        devName: z.string(),
        currentTask: z.string().optional(),
        currentTaskComment: z.string().optional(),
        nextTask: z.string().optional(),
        nextTaskComment: z.string().optional(),
        hasImpediment: z.boolean().optional(),
        impedimentIssue: z.string().optional(),
        impedimentComment: z.string().optional(),
        summary: z.string().optional(),
      })),
      metrics: z.any(),
      criticalIssues: z.any(),
      issues: z.any(),
    }))
    .mutation(async ({ input }) => {
      try {
        const devsText = input.devTurns.map(d => {
          let text = `**${d.devName}**\n`;
          if (d.currentTask) text += `- Task atual: ${d.currentTask}${d.currentTaskComment ? ` (${d.currentTaskComment})` : ''}\n`;
          if (d.nextTask) text += `- Próxima task: ${d.nextTask}${d.nextTaskComment ? ` (${d.nextTaskComment})` : ''}\n`;
          if (d.hasImpediment) text += `- ⚠️ IMPEDIMENTO: ${d.impedimentIssue || 'não especificado'}${d.impedimentComment ? ` - ${d.impedimentComment}` : ''}\n`;
          if (d.summary) text += `- Resumo: ${d.summary}\n`;
          return text;
        }).join('\n');

        const metricsText = input.metrics ? `
Métricas do Sprint:
- Taxa de Conclusão: ${input.metrics.completionRate?.today ?? 0}% (${input.metrics.completionRate?.delta >= 0 ? '+' : ''}${input.metrics.completionRate?.delta ?? 0}% vs ontem)
- Issues Atrasadas: ${input.metrics.overdue?.today ?? 0}
- Bloqueadores: ${input.metrics.blockers?.today ?? 0}` : '';

        const impediments = input.devTurns.filter(d => d.hasImpediment);
        const impedimentText = impediments.length > 0
          ? `\nImpedimentos reportados: ${impediments.map(d => `${d.devName}: ${d.impedimentIssue}`).join(', ')}`
          : '\nNenhum impedimento reportado.';

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um Scrum Master experiente que gera resumos executivos de daily standups em português brasileiro. 
Seu resumo deve incluir:
1. Visão geral do time (2-3 frases)
2. Pontos de atenção e riscos identificados
3. Análise preditiva de conclusão da sprint com base nos padrões apresentados
4. Recomendações acionáveis para o time
Seja direto, profissional e focado em valor para o negócio.`,
            },
            {
              role: "user",
              content: `Gere um resumo executivo da daily standup de hoje com base nos seguintes dados:\n\n${devsText}\n${metricsText}\n${impedimentText}`,
            },
          ],
        });

        return {
          report: response.choices[0].message.content,
          impedimentsCount: impediments.length,
          devsWithTurns: input.devTurns.length,
        };
      } catch (error) {
        console.error("Error generating daily report:", error);
        throw error;
      }
    }),
});
