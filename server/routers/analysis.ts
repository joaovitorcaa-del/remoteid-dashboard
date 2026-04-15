import { protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { sanitizeJql } from '../jql-sanitizer';
import { getDb } from '../db';
import { analysisIssues, analysisSyncLog } from '../../drizzle/schema';
import { eq, sql, desc, and, gte, lte, isNotNull } from 'drizzle-orm';

/**
 * Busca issues do JIRA com paginação completa (todas as páginas)
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
  let startAt = 0;
  const maxResults = 100;
  let total = Infinity;

  // Campos expandidos para capturar máximo de dados
  const fields = [
    'summary', 'status', 'assignee', 'reporter', 'created', 'updated',
    'priority', 'issuetype', 'project', 'labels', 'components',
    'resolution', 'resolutiondate', 'statuscategorychangedate',
    'customfield_10016', // Story Points (Jira Cloud)
    'customfield_10028', // Story Points (alternativo)
    'customfield_10029', // Story Points (alternativo 2)
    'customfield_10020', // Sprint
  ].join(',');

  console.log(`[Analysis Sync] Iniciando busca paginada com JQL: ${jql}`);

  while (startAt < total) {
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;

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
    total = data.total || 0;

    if (!data.issues || data.issues.length === 0) break;

    allIssues.push(...data.issues);
    startAt += data.issues.length;

    console.log(`[Analysis Sync] Página carregada: ${allIssues.length}/${total} issues`);
  }

  console.log(`[Analysis Sync] Total de issues baixadas: ${allIssues.length}`);
  return allIssues;
}

/**
 * Extrai story points de uma issue do JIRA (tenta múltiplos campos)
 */
function extractStoryPoints(fields: any): number {
  return fields.customfield_10016 || fields.customfield_10028 || fields.customfield_10029 || 0;
}

/**
 * Extrai informações de sprint de uma issue
 */
function extractSprint(fields: any): { name: string; state: string } | null {
  const sprints = fields.customfield_10020;
  if (!sprints || !Array.isArray(sprints) || sprints.length === 0) return null;
  // Pegar o sprint mais recente
  const latest = sprints[sprints.length - 1];
  return {
    name: latest.name || 'Sem nome',
    state: latest.state || 'unknown',
  };
}

/**
 * Converte issue do JIRA para formato de inserção no banco
 */
function jiraIssueToDbRow(issue: any, jqlSource: string) {
  const f = issue.fields;
  const sprint = extractSprint(f);

  return {
    issueKey: issue.key,
    summary: f.summary || null,
    issueType: f.issuetype?.name || null,
    status: f.status?.name || null,
    priority: f.priority?.name || null,
    assignee: f.assignee?.displayName || null,
    reporter: f.reporter?.displayName || null,
    project: f.project?.key || null,
    storyPoints: String(extractStoryPoints(f)),
    sprintName: sprint?.name || null,
    sprintState: sprint?.state || null,
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
   * Faz paginação completa para buscar TODAS as issues
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
        // Buscar TODAS as issues do JIRA com paginação
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
   * Retorna todas as issues persistidas no banco
   */
  getIssues: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      assignee: z.string().optional(),
      issueType: z.string().optional(),
      project: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input?.status) conditions.push(eq(analysisIssues.status, input.status));
      if (input?.assignee) conditions.push(eq(analysisIssues.assignee, input.assignee));
      if (input?.issueType) conditions.push(eq(analysisIssues.issueType, input.issueType));
      if (input?.project) conditions.push(eq(analysisIssues.project, input.project));

      const query = conditions.length > 0
        ? db.select().from(analysisIssues).where(and(...conditions))
        : db.select().from(analysisIssues);

      return await query;
    }),

  /**
   * Métricas de velocidade do time por sprint
   */
  getVelocityMetrics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { sprints: [], avgVelocity: 0 };

      // Agrupar por sprint
      const sprintData = await db.select({
        sprintName: analysisIssues.sprintName,
        sprintState: analysisIssues.sprintState,
        totalIssues: sql<number>`count(*)`,
        totalStoryPoints: sql<number>`COALESCE(sum(CAST(${analysisIssues.storyPoints} AS DECIMAL(10,2))), 0)`,
        completedIssues: sql<number>`sum(case when ${analysisIssues.status} in ('DONE', 'Done', 'Closed') then 1 else 0 end)`,
        completedStoryPoints: sql<number>`sum(case when ${analysisIssues.status} in ('DONE', 'Done', 'Closed') then CAST(${analysisIssues.storyPoints} AS DECIMAL(10,2)) else 0 end)`,
      })
        .from(analysisIssues)
        .where(isNotNull(analysisIssues.sprintName))
        .groupBy(analysisIssues.sprintName, analysisIssues.sprintState);

      const sprints = sprintData
        .filter(s => s.sprintName && s.sprintName !== 'Sem Sprint')
        .map(s => ({
          name: s.sprintName!,
          state: s.sprintState || 'unknown',
          totalIssues: Number(s.totalIssues),
          totalStoryPoints: Number(s.totalStoryPoints),
          completedIssues: Number(s.completedIssues),
          completedStoryPoints: Number(s.completedStoryPoints),
          completionRate: s.totalIssues > 0
            ? Math.round((Number(s.completedIssues) / Number(s.totalIssues)) * 100)
            : 0,
        }));

      const avgVelocity = sprints.length > 0
        ? Math.round(sprints.reduce((sum, s) => sum + s.completedStoryPoints, 0) / sprints.length)
        : 0;

      return { sprints, avgVelocity };
    }),

  /**
   * Métricas de capacidade do time
   */
  getCapacityMetrics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { members: [], summary: {} };

      // Issues por membro
      const memberData = await db.select({
        assignee: analysisIssues.assignee,
        totalIssues: sql<number>`count(*)`,
        totalStoryPoints: sql<number>`COALESCE(sum(CAST(${analysisIssues.storyPoints} AS DECIMAL(10,2))), 0)`,
        completedIssues: sql<number>`sum(case when ${analysisIssues.status} in ('DONE', 'Done', 'Closed') then 1 else 0 end)`,
        completedStoryPoints: sql<number>`sum(case when ${analysisIssues.status} in ('DONE', 'Done', 'Closed') then CAST(${analysisIssues.storyPoints} AS DECIMAL(10,2)) else 0 end)`,
        inProgressIssues: sql<number>`sum(case when ${analysisIssues.status} in ('CODE DOING', 'Code Doing', 'In Progress', 'CODE REVIEW', 'Code Review') then 1 else 0 end)`,
      })
        .from(analysisIssues)
        .groupBy(analysisIssues.assignee);

      const members = memberData.map(m => ({
        name: m.assignee || 'Não atribuído',
        totalIssues: Number(m.totalIssues),
        totalStoryPoints: Number(m.totalStoryPoints),
        completedIssues: Number(m.completedIssues),
        completedStoryPoints: Number(m.completedStoryPoints),
        inProgressIssues: Number(m.inProgressIssues),
        completionRate: m.totalIssues > 0
          ? Math.round((Number(m.completedIssues) / Number(m.totalIssues)) * 100)
          : 0,
      })).sort((a, b) => b.completedStoryPoints - a.completedStoryPoints);

      // Resumo geral
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
   * Throughput - issues concluídas por período (semana/mês)
   */
  getThroughput: protectedProcedure
    .input(z.object({
      periodType: z.enum(['week', 'month']).default('month'),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const periodType = input?.periodType || 'month';

      // Buscar issues com data de resolução
      const issues = await db.select().from(analysisIssues);

      // Agrupar por período usando data de criação
      const periodMap = new Map<string, {
        period: string;
        created: number;
        resolved: number;
        createdSP: number;
        resolvedSP: number;
        netFlow: number;
      }>();

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

        // Contar resolvidas
        const doneStatuses = ['DONE', 'Done', 'Closed', 'Cancelled', 'Canceled'];
        if (doneStatuses.includes(issue.status || '')) {
          p.resolved += 1;
          p.resolvedSP += Number(issue.storyPoints) || 0;
        }
      });

      // Converter e ordenar
      const periods = Array.from(periodMap.values())
        .map(p => ({
          ...p,
          netFlow: p.created - p.resolved,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return periods;
    }),

  /**
   * Cycle time médio por tipo de issue
   */
  getCycleTimeMetrics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const issues = await db.select().from(analysisIssues)
        .where(isNotNull(analysisIssues.resolvedAt));

      // Calcular cycle time (created -> resolved) por tipo
      const typeMap = new Map<string, { times: number[]; count: number }>();

      issues.forEach(issue => {
        if (!issue.createdAt || !issue.resolvedAt) return;

        const type = issue.issueType || 'Desconhecido';
        const created = new Date(issue.createdAt).getTime();
        const resolved = new Date(issue.resolvedAt).getTime();
        const cycleDays = (resolved - created) / (1000 * 60 * 60 * 24);

        if (cycleDays < 0 || cycleDays > 365) return; // Ignorar outliers

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
   * Cumulative Flow Diagram data
   */
  getCumulativeFlow: protectedProcedure
    .input(z.object({
      periodType: z.enum(['week', 'month']).default('month'),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const periodType = input?.periodType || 'month';
      const issues = await db.select().from(analysisIssues);

      // Definir categorias de status
      const statusCategories: Record<string, string> = {
        'Backlog': 'Backlog',
        'OPENED': 'Backlog',
        'Prioritized': 'Backlog',
        'Ready to Sprint': 'To Do',
        'Dev To Do': 'To Do',
        'Dev to Do': 'To Do',
        'CODE DOING': 'Em Desenvolvimento',
        'Code Doing': 'Em Desenvolvimento',
        'In Progress': 'Em Desenvolvimento',
        'CODE REVIEW': 'Em Revisão',
        'Code Review': 'Em Revisão',
        'In Review': 'Em Revisão',
        'TEST TO DO': 'Em QA',
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

      // Agrupar por período
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
   * Distribuição por status, tipo, prioridade
   */
  getDistributions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { byStatus: [], byType: [], byPriority: [], byProject: [] };

      const issues = await db.select().from(analysisIssues);

      // Por status
      const statusMap = new Map<string, number>();
      const typeMap = new Map<string, number>();
      const priorityMap = new Map<string, number>();
      const projectMap = new Map<string, number>();

      issues.forEach(issue => {
        const status = issue.status || 'Desconhecido';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);

        const type = issue.issueType || 'Desconhecido';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);

        const priority = issue.priority || 'Desconhecido';
        priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);

        const project = issue.project || 'Desconhecido';
        projectMap.set(project, (projectMap.get(project) || 0) + 1);
      });

      const mapToArray = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([name, count]) => ({ name, count, percentage: Math.round((count / issues.length) * 100) }))
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
   * Métricas de produtividade por período (mantém compatibilidade)
   */
  getProductivityMetrics: protectedProcedure
    .input(z.object({
      periodType: z.enum(['sprint', 'month', 'week']),
      assignees: z.array(z.string()).optional(),
      issueTypes: z.array(z.string()).optional(),
      startDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { periods: [], totalIssues: 0, totalStoryPoints: 0 };

      const { periodType, assignees, issueTypes } = input;

      let issues = await db.select().from(analysisIssues);

      // Aplicar filtros
      if (assignees && assignees.length > 0) {
        issues = issues.filter(i => assignees.includes(i.assignee || ''));
      }
      if (issueTypes && issueTypes.length > 0) {
        issues = issues.filter(i => issueTypes.includes(i.issueType || ''));
      }

      // Agrupar por período
      const periodMap = new Map<string, any>();

      issues.forEach(issue => {
        if (!issue.createdAt) return;
        const created = new Date(issue.createdAt);
        let periodKey: string;

        if (periodType === 'sprint') {
          periodKey = issue.sprintName || 'Sem Sprint';
        } else if (periodType === 'month') {
          periodKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        } else {
          const weekStart = new Date(created);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            period: periodKey,
            quantity: 0,
            storyPoints: 0,
            byType: {},
          });
        }

        const p = periodMap.get(periodKey);
        p.quantity += 1;
        p.storyPoints += Number(issue.storyPoints) || 0;

        const type = issue.issueType || 'Desconhecido';
        if (!p.byType[type]) p.byType[type] = { quantity: 0, storyPoints: 0 };
        p.byType[type].quantity += 1;
        p.byType[type].storyPoints += Number(issue.storyPoints) || 0;
      });

      const periods = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));

      return {
        periods,
        totalIssues: issues.length,
        totalStoryPoints: issues.reduce((sum, i) => sum + (Number(i.storyPoints) || 0), 0),
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
