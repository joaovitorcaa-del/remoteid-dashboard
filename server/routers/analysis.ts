import { protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { sanitizeJql } from '../jql-sanitizer';
import { getDb } from '../db';
import { analysisIssues, analysisSyncLog } from '../../drizzle/schema';
import { eq, sql, desc, and, gte, lte, isNotNull, inArray } from 'drizzle-orm';

/**
 * Busca issues do JIRA com paginação por token (API v3 /search/jql)
 * A API v2 foi descontinuada (410 Gone), usa-se v3 com nextPageToken/isLast
 */
async function fetchAllJiraIssuesPaginated(jql: string): Promise<any[]> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraUrl || !jiraEmail || !jiraToken) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
  const allIssues: any[] = [];

  // Campos expandidos para capturar máximo de dados
  // customfield_10004 = Story Points (confirmado via /rest/api/3/field)
  // customfield_10007 = Sprint (confirmado via /rest/api/3/field - não customfield_10020)
  const fields = [
    'summary', 'status', 'assignee', 'reporter', 'created', 'updated',
    'priority', 'issuetype', 'project', 'labels', 'components',
    'resolution', 'resolutiondate', 'statuscategorychangedate',
    'customfield_10004', // Story Points (confirmado)
    'customfield_10007', // Sprint (confirmado - não customfield_10020)
  ].join(',');

  console.log(`[Analysis Sync] Iniciando busca paginada com JQL: ${jql}`);

  let nextPageToken: string | null = null;
  let isLast = false;
  let pageCount = 0;
  const maxResults = 100;

  while (!isLast) {
    let url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${fields}`;
    if (nextPageToken) {
      url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro JIRA API: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    pageCount++;

    if (!data.issues || data.issues.length === 0) {
      console.log(`[Analysis Sync] Página ${pageCount}: sem issues, parando`);
      break;
    }

    allIssues.push(...data.issues);
    nextPageToken = data.nextPageToken || null;
    isLast = data.isLast === true;

    console.log(`[Analysis Sync] Página ${pageCount}: ${data.issues.length} issues (total: ${allIssues.length}, isLast: ${isLast})`);
  }

  console.log(`[Analysis Sync] Total de issues baixadas: ${allIssues.length} em ${pageCount} páginas`);
  return allIssues;
}

/**
 * Extrai story points de uma issue do JIRA
 * Campo confirmado: customfield_10004
 */
function extractStoryPoints(fields: any): number {
  const sp = fields.customfield_10004;
  if (sp != null && typeof sp === 'number' && sp > 0) return sp;
  return 0;
}

/**
 * Extrai informações de sprint de uma issue
 * Campo correto: customfield_10007 (não customfield_10020)
 */
function extractSprint(fields: any): { name: string; state: string; startDate?: Date; endDate?: Date } | null {
  const sprints = fields.customfield_10007;
  if (!sprints || !Array.isArray(sprints) || sprints.length === 0) return null;
  const latest = sprints[sprints.length - 1];
  return {
    name: latest.name || 'Sem nome',
    state: latest.state || 'unknown',
    startDate: latest.startDate ? new Date(latest.startDate) : undefined,
    endDate: latest.endDate ? new Date(latest.endDate) : undefined,
  };
}

/**
 * Converte issue do JIRA para formato de inserção no banco
 */
function jiraIssueToDbRow(issue: any, jqlSource: string) {
  const f = issue.fields;
  const sprint = extractSprint(f);
  const sp = extractStoryPoints(f);

  return {
    issueKey: issue.key,
    summary: f.summary || null,
    issueType: f.issuetype?.name || null,
    status: f.status?.name || null,
    priority: f.priority?.name || null,
    assignee: f.assignee?.displayName || null,
    reporter: f.reporter?.displayName || null,
    project: f.project?.key || null,
    storyPoints: String(sp),
    sprintName: sprint?.name || null,
    sprintState: sprint?.state || null,
    sprintStartDate: sprint?.startDate || null,
    sprintEndDate: sprint?.endDate || null,
    labels: f.labels && f.labels.length > 0 ? JSON.stringify(f.labels) : null,
    components: f.components && f.components.length > 0
      ? JSON.stringify(f.components.map((c: any) => c.name))
      : null,
    resolution: f.resolution?.name || null,
    createdAt: f.created ? new Date(f.created) : null,
    updatedAt: f.updated ? new Date(f.updated) : null,
    resolvedAt: f.resolutiondate ? new Date(f.resolutiondate) : null,
    statusChangedAt: f.statuscategorychangedate ? new Date(f.statuscategorychangedate) : null,
    syncedAt: new Date(),
    jqlSource,
  };
}

export const analysisRouter = {
  /**
   * Sincroniza issues do JIRA para o banco local
   * Usa paginação por token para buscar TODAS as issues sem limite
   */
  syncJiraData: protectedProcedure
    .input(z.object({
      jql: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const cleanJql = sanitizeJql(input.jql);
      const startTime = Date.now();

      // Criar log de sync
      const [logResult] = await db.insert(analysisSyncLog).values({
        jql: cleanJql,
        totalIssues: 0,
        status: 'running',
      });
      const syncLogId = logResult.insertId;

      try {
        // Buscar TODAS as issues do JIRA com paginação por token
        const jiraIssues = await fetchAllJiraIssuesPaginated(cleanJql);

        // Limpar issues anteriores com mesmo JQL
        await db.delete(analysisIssues).where(eq(analysisIssues.jqlSource, cleanJql));

        // Inserir em lotes de 50
        const batchSize = 50;
        for (let i = 0; i < jiraIssues.length; i += batchSize) {
          const batch = jiraIssues.slice(i, i + batchSize);
          const rows = batch.map(issue => jiraIssueToDbRow(issue, cleanJql));
          if (rows.length > 0) {
            await db.insert(analysisIssues).values(rows);
          }
        }

        const durationMs = Date.now() - startTime;

        // Atualizar log de sync
        await db.update(analysisSyncLog)
          .set({
            totalIssues: jiraIssues.length,
            status: 'completed',
            completedAt: new Date(),
            durationMs,
          })
          .where(eq(analysisSyncLog.id, Number(syncLogId)));

        console.log(`[Analysis Sync] Concluído: ${jiraIssues.length} issues em ${durationMs}ms`);

        return {
          success: true,
          totalIssues: jiraIssues.length,
          durationMs,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

        await db.update(analysisSyncLog)
          .set({
            status: 'failed',
            errorMessage: errorMsg,
            completedAt: new Date(),
            durationMs,
          })
          .where(eq(analysisSyncLog.id, Number(syncLogId)));

        throw new Error(`Erro ao sincronizar: ${errorMsg}`);
      }
    }),

  /**
   * Retorna status da última sincronização
   */
  getSyncStatus: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;

      const [lastSync] = await db.select()
        .from(analysisSyncLog)
        .orderBy(desc(analysisSyncLog.startedAt))
        .limit(1);

      if (!lastSync) return null;

      // Contar issues no banco
      const [countResult] = await db.select({
        count: sql<number>`count(*)`,
      }).from(analysisIssues);

      return {
        ...lastSync,
        issuesInDb: countResult?.count || 0,
      };
    }),

  /**
   * Retorna todas as issues persistidas no banco com filtros
   */
  getIssues: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      assignee: z.string().optional(),
      issueType: z.string().optional(),
      project: z.string().optional(),
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input?.status) conditions.push(eq(analysisIssues.status, input.status));
      if (input?.assignee) conditions.push(eq(analysisIssues.assignee, input.assignee));
      if (input?.issueType) conditions.push(eq(analysisIssues.issueType, input.issueType));
      if (input?.project) conditions.push(eq(analysisIssues.project, input.project));
      if (input?.issueTypes && input.issueTypes.length > 0) {
        conditions.push(inArray(analysisIssues.issueType, input.issueTypes));
      }
      if (input?.projects && input.projects.length > 0) {
        conditions.push(inArray(analysisIssues.project, input.projects));
      }
      if (input?.startDate) {
        conditions.push(gte(analysisIssues.createdAt, new Date(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(analysisIssues.createdAt, new Date(input.endDate)));
      }

      const query = conditions.length > 0
        ? db.select().from(analysisIssues).where(and(...conditions))
        : db.select().from(analysisIssues);

      return await query;
    }),

  /**
   * Métricas de velocidade do time por sprint com filtros
   */
  getVelocityMetrics: protectedProcedure
    .input(z.object({
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sprints: [], avgVelocity: 0, totalStoryPoints: 0 };

      // Buscar todas as issues e filtrar em memória para flexibilidade
      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      // Agrupar por sprint
      const sprintMap = new Map<string, {
        name: string;
        state: string;
        startDate: any;
        endDate: any;
        totalIssues: number;
        totalStoryPoints: number;
        completedIssues: number;
        completedStoryPoints: number;
      }>();

      const doneStatuses = ['DONE', 'Done', 'Closed'];

      issues.forEach(issue => {
        const sprintName = issue.sprintName || 'Sem Sprint';
        const sp = Number(issue.storyPoints) || 0;
        const isDone = doneStatuses.includes(issue.status || '');

        if (!sprintMap.has(sprintName)) {
          sprintMap.set(sprintName, {
            name: sprintName,
            state: issue.sprintState || 'unknown',
            startDate: issue.sprintStartDate,
            endDate: issue.sprintEndDate,
            totalIssues: 0,
            totalStoryPoints: 0,
            completedIssues: 0,
            completedStoryPoints: 0,
          });
        }

        const s = sprintMap.get(sprintName)!;
        s.totalIssues += 1;
        s.totalStoryPoints += sp;
        if (isDone) {
          s.completedIssues += 1;
          s.completedStoryPoints += sp;
        }
      });

      const sprints = Array.from(sprintMap.values())
        .filter(s => s.name !== 'Sem Sprint')
        .map(s => ({
          ...s,
          completionRate: s.totalIssues > 0
            ? Math.round((s.completedIssues / s.totalIssues) * 100)
            : 0,
        }))
        .sort((a, b) => {
          // Ordenar por startDate (antigas primeiro), depois por estado
          if (a.startDate && b.startDate) {
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          }
          // Fallback para nome se nao houver data
          return a.name.localeCompare(b.name);
        });

      const avgVelocity = sprints.length > 0
        ? Math.round(sprints.reduce((sum, s) => sum + s.completedStoryPoints, 0) / sprints.length)
        : 0;

      const totalStoryPoints = issues.reduce((sum, i) => sum + (Number(i.storyPoints) || 0), 0);
      const completedStoryPoints = issues
        .filter(i => doneStatuses.includes(i.status || ''))
        .reduce((sum, i) => sum + (Number(i.storyPoints) || 0), 0);

      return { sprints, avgVelocity, totalStoryPoints, completedStoryPoints };
    }),

  /**
   * Métricas de capacidade do time com filtros
   */
  getCapacityMetrics: protectedProcedure
    .input(z.object({
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { members: [], summary: {} };

      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      const doneStatuses = ['DONE', 'Done', 'Closed'];
      const inProgressStatuses = ['CODE DOING', 'Code Doing', 'In Progress', 'CODE REVIEW', 'Code Review'];

      // Issues por membro
      const memberMap = new Map<string, {
        name: string;
        totalIssues: number;
        totalStoryPoints: number;
        completedIssues: number;
        completedStoryPoints: number;
        inProgressIssues: number;
      }>();

      issues.forEach(issue => {
        const name = issue.assignee || 'Não atribuído';
        const sp = Number(issue.storyPoints) || 0;

        if (!memberMap.has(name)) {
          memberMap.set(name, {
            name,
            totalIssues: 0,
            totalStoryPoints: 0,
            completedIssues: 0,
            completedStoryPoints: 0,
            inProgressIssues: 0,
          });
        }

        const m = memberMap.get(name)!;
        m.totalIssues += 1;
        m.totalStoryPoints += sp;
        if (doneStatuses.includes(issue.status || '')) {
          m.completedIssues += 1;
          m.completedStoryPoints += sp;
        }
        if (inProgressStatuses.includes(issue.status || '')) {
          m.inProgressIssues += 1;
        }
      });

      const members = Array.from(memberMap.values())
        .map(m => ({
          ...m,
          completionRate: m.totalIssues > 0
            ? Math.round((m.completedIssues / m.totalIssues) * 100)
            : 0,
        }))
        .sort((a, b) => b.completedStoryPoints - a.completedStoryPoints);

      const totalIssues = members.reduce((sum, m) => sum + m.totalIssues, 0);
      const totalSP = members.reduce((sum, m) => sum + m.totalStoryPoints, 0);
      const completedIssues = members.reduce((sum, m) => sum + m.completedIssues, 0);
      const completedSP = members.reduce((sum, m) => sum + m.completedStoryPoints, 0);

      return {
        members,
        summary: {
          totalMembers: members.filter(m => m.name !== 'Não atribuído').length,
          totalIssues,
          totalStoryPoints: totalSP,
          completedIssues,
          completedStoryPoints: completedSP,
          avgIssuesPerMember: members.length > 0 ? Math.round(totalIssues / members.length) : 0,
          avgSPPerMember: members.length > 0 ? Math.round(totalSP / members.length) : 0,
        },
      };
    }),

  /**
   * Throughput - issues concluídas por período (semana/mês) com filtros
   */
  getThroughput: protectedProcedure
    .input(z.object({
      periodType: z.enum(['week', 'month']).default('month'),
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const periodType = input?.periodType || 'month';
      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      const periodMap = new Map<string, {
        period: string;
        created: number;
        resolved: number;
        createdSP: number;
        resolvedSP: number;
        netFlow: number;
      }>();

      const doneStatuses = ['DONE', 'Done', 'Closed'];

      issues.forEach(issue => {
        if (!issue.createdAt) return;

        const created = new Date(issue.createdAt);
        let periodKey: string;

        if (periodType === 'month') {
          periodKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        } else {
          const weekStart = new Date(created);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            period: periodKey,
            created: 0,
            resolved: 0,
            createdSP: 0,
            resolvedSP: 0,
            netFlow: 0,
          });
        }

        const p = periodMap.get(periodKey)!;
        p.created += 1;
        p.createdSP += Number(issue.storyPoints) || 0;

        if (doneStatuses.includes(issue.status || '')) {
          p.resolved += 1;
          p.resolvedSP += Number(issue.storyPoints) || 0;
        }
      });

      const periods = Array.from(periodMap.values())
        .map(p => ({
          ...p,
          netFlow: p.created - p.resolved,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return periods;
    }),

  /**
   * Cycle time médio por tipo de issue com filtros
   */
  getCycleTimeMetrics: protectedProcedure
    .input(z.object({
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let issues = await db.select().from(analysisIssues)
        .where(isNotNull(analysisIssues.resolvedAt));

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      const typeMap = new Map<string, { times: number[]; count: number }>();

      issues.forEach(issue => {
        if (!issue.createdAt || !issue.resolvedAt) return;

        const type = issue.issueType || 'Desconhecido';
        const created = new Date(issue.createdAt).getTime();
        const resolved = new Date(issue.resolvedAt).getTime();
        const cycleDays = (resolved - created) / (1000 * 60 * 60 * 24);

        if (cycleDays < 0 || cycleDays > 365) return;

        if (!typeMap.has(type)) {
          typeMap.set(type, { times: [], count: 0 });
        }

        const entry = typeMap.get(type)!;
        entry.times.push(cycleDays);
        entry.count += 1;
      });

      return Array.from(typeMap.entries()).map(([type, data]) => {
        const sorted = data.times.sort((a, b) => a - b);
        const avg = sorted.reduce((sum, t) => sum + t, 0) / sorted.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        const p85 = sorted[Math.floor(sorted.length * 0.85)] || 0;

        return {
          issueType: type,
          count: data.count,
          avgDays: Math.round(avg * 10) / 10,
          medianDays: Math.round(median * 10) / 10,
          p85Days: Math.round(p85 * 10) / 10,
          minDays: Math.round(sorted[0] * 10) / 10,
          maxDays: Math.round(sorted[sorted.length - 1] * 10) / 10,
        };
      }).sort((a, b) => b.count - a.count);
    }),

  /**
   * Cumulative Flow Diagram data com filtros
   */
  getCumulativeFlow: protectedProcedure
    .input(z.object({
      periodType: z.enum(['week', 'month']).default('month'),
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const periodType = input?.periodType || 'month';
      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      const statusCategories: Record<string, string> = {
        'Backlog': 'Backlog',
        'OPENED': 'Backlog',
        'Prioritized': 'Backlog',
        'USER STORY REFINEMENT': 'Backlog',
        'USER STORY WRITTEN': 'Backlog',
        'Ready to Sprint': 'To Do',
        'READY TO SPRINT': 'To Do',
        'Dev To Do': 'To Do',
        'Dev to Do': 'To Do',
        'CODE DOING': 'Em Desenvolvimento',
        'Code Doing': 'Em Desenvolvimento',
        'In Progress': 'Em Desenvolvimento',
        'CODE REVIEW': 'Em Revisão',
        'Code Review': 'Em Revisão',
        'In Review': 'Em Revisão',
        'TEST TO DO': 'Em QA',
        'Test To Do': 'Em QA',
        'Test to Do': 'Em QA',
        'TEST DOING': 'Em QA',
        'Test Doing': 'Em QA',
        'STAGING': 'Staging',
        'Staging': 'Staging',
        'DONE': 'Concluído',
        'Done': 'Concluído',
        'Closed': 'Concluído',
        'Cancelled': 'Cancelado',
        'Canceled': 'Cancelado',
      };

      const periodMap = new Map<string, Record<string, number>>();

      issues.forEach(issue => {
        if (!issue.createdAt) return;

        const created = new Date(issue.createdAt);
        let periodKey: string;

        if (periodType === 'month') {
          periodKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        } else {
          const weekStart = new Date(created);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            'Backlog': 0,
            'To Do': 0,
            'Em Desenvolvimento': 0,
            'Em Revisão': 0,
            'Em QA': 0,
            'Staging': 0,
            'Concluído': 0,
            'Cancelado': 0,
          });
        }

        const category = statusCategories[issue.status || ''] || 'Backlog';
        const p = periodMap.get(periodKey)!;
        p[category] = (p[category] || 0) + 1;
      });

      return Array.from(periodMap.entries())
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }),

  /**
   * Distribuição por status, tipo, prioridade com filtros
   */
  getDistributions: protectedProcedure
    .input(z.object({
      issueTypes: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { byStatus: [], byType: [], byPriority: [], byProject: [], totalIssues: 0 };

      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (input?.issueTypes && input.issueTypes.length > 0) {
        issues = issues.filter(i => input.issueTypes!.includes(i.issueType || ''));
      }
      if (input?.projects && input.projects.length > 0) {
        issues = issues.filter(i => input.projects!.includes(i.project || ''));
      }
      if (input?.startDate) {
        const start = new Date(input.startDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) >= start);
      }
      if (input?.endDate) {
        const end = new Date(input.endDate);
        issues = issues.filter(i => i.createdAt && new Date(i.createdAt) <= end);
      }

      const statusMap = new Map<string, number>();
      const typeMap = new Map<string, number>();
      const priorityMap = new Map<string, number>();
      const projectMap = new Map<string, number>();

      issues.forEach(issue => {
        statusMap.set(issue.status || 'Desconhecido', (statusMap.get(issue.status || 'Desconhecido') || 0) + 1);
        typeMap.set(issue.issueType || 'Desconhecido', (typeMap.get(issue.issueType || 'Desconhecido') || 0) + 1);
        priorityMap.set(issue.priority || 'Desconhecido', (priorityMap.get(issue.priority || 'Desconhecido') || 0) + 1);
        projectMap.set(issue.project || 'Desconhecido', (projectMap.get(issue.project || 'Desconhecido') || 0) + 1);
      });

      const mapToArray = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([name, count]) => ({ name, count, percentage: issues.length > 0 ? Math.round((count / issues.length) * 100) : 0 }))
          .sort((a, b) => b.count - a.count);

      return {
        byStatus: mapToArray(statusMap),
        byType: mapToArray(typeMap),
        byPriority: mapToArray(priorityMap),
        byProject: mapToArray(projectMap),
        totalIssues: issues.length,
      };
    }),

  /**
   * Buscar lista de issue types disponíveis
   */
  getIssueTypes: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const types = await db.selectDistinct({ issueType: analysisIssues.issueType })
        .from(analysisIssues)
        .where(isNotNull(analysisIssues.issueType));

      return types.map(t => t.issueType).filter(Boolean).sort() as string[];
    }),

  /**
   * Buscar lista de projetos disponíveis
   */
  getProjects: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const projects = await db.selectDistinct({ project: analysisIssues.project })
        .from(analysisIssues)
        .where(isNotNull(analysisIssues.project));

      return projects.map(p => p.project).filter(Boolean).sort() as string[];
    }),

  /**
   * Buscar lista de status disponíveis
   */
  getStatuses: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const statuses = await db.selectDistinct({ status: analysisIssues.status })
        .from(analysisIssues)
        .where(isNotNull(analysisIssues.status));

      return statuses.map(s => s.status).filter(Boolean).sort() as string[];
    }),

  /**
   * Buscar lista de assignees disponíveis
   */
  getAssignees: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const assignees = await db.selectDistinct({ assignee: analysisIssues.assignee })
        .from(analysisIssues)
        .where(isNotNull(analysisIssues.assignee));

      return assignees.map(a => a.assignee).filter(Boolean).sort() as string[];
    }),

  /**
   * Histórico de sincronizações
   */
  getSyncHistory: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select()
        .from(analysisSyncLog)
        .orderBy(desc(analysisSyncLog.startedAt))
        .limit(10);
    }),
};
