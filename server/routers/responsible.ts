import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { fetchJiraIssuesByJql } from '../jira-sync';

export const responsibleRouter = router({
  // Novo nome: getMetricsByPeriod (mais descritivo)
  getMetricsByPeriod: protectedProcedure
    .input(z.object({
      assignees: z.array(z.string()).optional(),
      startDate: z.string(),
      endDate: z.string(),
      periodType: z.enum(['week', 'month', 'sprint']).optional(),
    }))
    .query(async ({ input }) => {
      try {
        // Importar builders de JQL
        const { buildAssigneeJql, buildDateRangeJql, sanitizeJql } = await import('../jql-sanitizer');
        
        // Construir JQL de forma segura
        let jql = 'project = REMOTEID and created >= 2025-07-01';

        // Adicionar filtro de período
        if (input.startDate && input.endDate) {
          jql = buildDateRangeJql(jql, input.startDate, input.endDate);
        }

        // Adicionar filtro de responsáveis
        if (input.assignees && input.assignees.length > 0) {
          jql = buildAssigneeJql(jql, input.assignees);
        } else {
          jql = sanitizeJql(jql);
        }

        // Buscar issues do Jira
        const issues = await fetchJiraIssuesByJql(jql);

        // Processar dados por responsável
        const developerMap = new Map<string, {
          name: string;
          totalTasks: number;
          completedTasks: number;
          inProgressTasks: number;
          totalStoryPoints: number;
          completedStoryPoints?: number;
          velocity?: number;
          efficiency?: number;
          tasksByType: Record<string, number>;
          tasksByStatus: Record<string, number>;
          tasksBySprint: Record<string, number>;
        }>();

        issues.forEach((issue: any) => {
          const assignee = issue.fields?.assignee?.displayName || 'Não Atribuído';
          const status = issue.fields?.status?.name || 'Unknown';
          const issueType = issue.fields?.issuetype?.name || 'Unknown';
          const sprint = issue.fields?.sprint?.name || 'Sem Sprint';
          // Tentar múltiplos campos de Story Points
          const storyPoints = issue.fields?.customfield_10016 
            || issue.fields?.customfield_10005 
            || issue.fields?.customfield_10004 
            || 0;

          if (!developerMap.has(assignee)) {
            developerMap.set(assignee, {
              name: assignee,
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              totalStoryPoints: 0,
              tasksByType: {},
              tasksByStatus: {},
              tasksBySprint: {},
            });
          }

          const dev = developerMap.get(assignee)!;
          dev.totalTasks++;
          dev.totalStoryPoints += (typeof storyPoints === 'number' ? storyPoints : 0);

          // Contar por status
          if (status === 'Done') {
            dev.completedTasks++;
          } else if (status === 'In Progress' || status === 'CODE DOING') {
            dev.inProgressTasks++;
          }

          // Contar por tipo
          dev.tasksByType[issueType] = (dev.tasksByType[issueType] || 0) + 1;

          // Contar por status
          dev.tasksByStatus[status] = (dev.tasksByStatus[status] || 0) + 1;

          // Contar por sprint
          dev.tasksBySprint[sprint] = (dev.tasksBySprint[sprint] || 0) + 1;
        });

        // Converter para array e calcular métricas
        const developers = Array.from(developerMap.values()).map(dev => {
          const completionRate = dev.totalTasks > 0 ? (dev.completedTasks / dev.totalTasks) * 100 : 0;
          const velocity = dev.totalStoryPoints > 0 ? (dev.completedTasks / dev.totalTasks) * dev.totalStoryPoints : 0;
          const efficiency = dev.totalTasks > 0 ? dev.completedTasks / dev.totalTasks : 0;
          
          return {
            ...dev,
            completionRate,
            velocity: velocity,
            efficiency: efficiency,
            completedStoryPoints: Math.round(dev.completedTasks * (dev.totalStoryPoints / Math.max(dev.totalTasks, 1))),
          };
        });

        // Calcular resumo
        const summary = {
          totalTasks: developers.reduce((sum, d) => sum + d.totalTasks, 0),
          totalDevelopers: developers.length,
          averageCompletionRate: developers.length > 0
            ? developers.reduce((sum, d) => sum + d.completionRate, 0) / developers.length
            : 0,
          totalStoryPoints: developers.reduce((sum, d) => sum + d.totalStoryPoints, 0),
        };

        return {
          developers: developers as any,
          summary,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Erro ao buscar métricas de responsáveis:', error);
        throw new Error(`Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }),

  getAllAssignees: protectedProcedure
    .query(async () => {
      try {
        // Buscar todas as issues desde julho de 2025
        const { sanitizeJql } = await import('../jql-sanitizer');
        const jql = sanitizeJql('project = REMOTEID and created >= 2025-07-01 order by updated desc');
        const issues = await fetchJiraIssuesByJql(jql);

        // Extrair responsáveis únicos
        const assignees = new Set<string>();
        issues.forEach((issue: any) => {
          const assignee = issue.fields?.assignee?.displayName;
          if (assignee) {
            assignees.add(assignee);
          }
        });

        return Array.from(assignees).sort();
      } catch (error) {
        console.error('Erro ao buscar responsáveis:', error);
        throw new Error(`Erro ao buscar responsáveis: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }),
});
