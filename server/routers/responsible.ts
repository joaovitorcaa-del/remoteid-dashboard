import { protectedProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { fetchJiraIssuesByJql } from '../jira-sync';

export const responsibleRouter = router({
  // Endpoint para buscar métricas por período com suporte a múltiplos desenvolvedores
  getMetricsByPeriod: protectedProcedure
    .input(z.object({
      assignees: z.array(z.string()).optional(),
      periodType: z.enum(['sprint', 'month', 'week']).default('sprint'),
    }))
    .query(async ({ input }) => {
      try {
        const { sanitizeJql } = await import('../jql-sanitizer');
        
        // JQL base: todos os projetos desde julho/2025
        let jql = 'project in ("RemoteID", "DesktopID", "Mobile ID") and created >= "2025-07-01" order by priority desc';
        
        // Adicionar filtro de responsáveis se fornecido
        if (input.assignees && input.assignees.length > 0) {
          const assigneesList = input.assignees.map(a => `"${a}"`).join(', ');
          jql = `assignee in (${assigneesList}) and ${jql}`;
        }
        
        jql = sanitizeJql(jql);
        
        // Buscar issues do Jira
        const issues = await fetchJiraIssuesByJql(jql);

        // Agrupar dados por período e desenvolvedor
        const periodMap = new Map<string, {
          period: string;
          totalTasks: number;
          completedTasks: number;
          inProgressTasks: number;
          totalStoryPoints: number;
          tasksByType: Record<string, number>;
          tasksByStatus: Record<string, number>;
          tasksByAssignee: Record<string, {
            total: number;
            completed: number;
            inProgress: number;
            storyPoints: number;
          }>;
        }>();

        const developerMap = new Map<string, {
          name: string;
          totalTasks: number;
          completedTasks: number;
          inProgressTasks: number;
          totalStoryPoints: number;
          tasksByType: Record<string, number>;
          tasksByStatus: Record<string, number>;
          tasksByPeriod: Record<string, number>;
        }>();

        // Processar cada issue
        issues.forEach((issue: any) => {
          const assignee = issue.fields?.assignee?.displayName || 'Não Atribuído';
          const status = issue.fields?.status?.name || 'Unknown';
          const issueType = issue.fields?.issuetype?.name || 'Unknown';
          const createdDate = issue.fields?.created ? new Date(issue.fields.created) : new Date();
          const storyPoints = issue.fields?.customfield_10016 
            || issue.fields?.customfield_10005 
            || issue.fields?.customfield_10004 
            || 0;

          // Determinar período baseado no tipo selecionado
          let periodKey = '';
          if (input.periodType === 'sprint') {
            const sprint = issue.fields?.sprint?.name || 'Sem Sprint';
            periodKey = sprint;
          } else if (input.periodType === 'month') {
            periodKey = createdDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          } else if (input.periodType === 'week') {
            const weekStart = new Date(createdDate);
            weekStart.setDate(createdDate.getDate() - createdDate.getDay());
            periodKey = `Semana de ${weekStart.toLocaleDateString('pt-BR')}`;
          }

          // Atualizar mapa de períodos
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              period: periodKey,
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              totalStoryPoints: 0,
              tasksByType: {},
              tasksByStatus: {},
              tasksByAssignee: {},
            });
          }

          const periodData = periodMap.get(periodKey)!;
          periodData.totalTasks++;
          periodData.totalStoryPoints += (typeof storyPoints === 'number' ? storyPoints : 0);

          if (status === 'Done') {
            periodData.completedTasks++;
          } else if (status === 'In Progress' || status === 'CODE DOING') {
            periodData.inProgressTasks++;
          }

          periodData.tasksByType[issueType] = (periodData.tasksByType[issueType] || 0) + 1;
          periodData.tasksByStatus[status] = (periodData.tasksByStatus[status] || 0) + 1;

          if (!periodData.tasksByAssignee[assignee]) {
            periodData.tasksByAssignee[assignee] = {
              total: 0,
              completed: 0,
              inProgress: 0,
              storyPoints: 0,
            };
          }

          periodData.tasksByAssignee[assignee].total++;
          periodData.tasksByAssignee[assignee].storyPoints += (typeof storyPoints === 'number' ? storyPoints : 0);

          if (status === 'Done') {
            periodData.tasksByAssignee[assignee].completed++;
          } else if (status === 'In Progress' || status === 'CODE DOING') {
            periodData.tasksByAssignee[assignee].inProgress++;
          }

          // Atualizar mapa de desenvolvedores
          if (!developerMap.has(assignee)) {
            developerMap.set(assignee, {
              name: assignee,
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              totalStoryPoints: 0,
              tasksByType: {},
              tasksByStatus: {},
              tasksByPeriod: {},
            });
          }

          const devData = developerMap.get(assignee)!;
          devData.totalTasks++;
          devData.totalStoryPoints += (typeof storyPoints === 'number' ? storyPoints : 0);

          if (status === 'Done') {
            devData.completedTasks++;
          } else if (status === 'In Progress' || status === 'CODE DOING') {
            devData.inProgressTasks++;
          }

          devData.tasksByType[issueType] = (devData.tasksByType[issueType] || 0) + 1;
          devData.tasksByStatus[status] = (devData.tasksByStatus[status] || 0) + 1;
          devData.tasksByPeriod[periodKey] = (devData.tasksByPeriod[periodKey] || 0) + 1;
        });

        // Converter para arrays
        const periods = Array.from(periodMap.values());
        const developers = Array.from(developerMap.values()).map(dev => ({
          ...dev,
          completionRate: dev.totalTasks > 0 ? (dev.completedTasks / dev.totalTasks) * 100 : 0,
          velocity: dev.totalStoryPoints > 0 ? (dev.completedTasks / dev.totalTasks) * dev.totalStoryPoints : 0,
          efficiency: dev.totalTasks > 0 ? dev.completedTasks / dev.totalTasks : 0,
        }));

        // Calcular resumo geral
        const summary = {
          totalTasks: developers.reduce((sum, d) => sum + d.totalTasks, 0),
          completedTasks: developers.reduce((sum, d) => sum + d.completedTasks, 0),
          inProgressTasks: developers.reduce((sum, d) => sum + d.inProgressTasks, 0),
          totalDevelopers: developers.length,
          totalStoryPoints: developers.reduce((sum, d) => sum + d.totalStoryPoints, 0),
          averageCompletionRate: developers.length > 0
            ? developers.reduce((sum, d) => sum + d.completionRate, 0) / developers.length
            : 0,
        };

        return {
          periods,
          developers: developers as any,
          summary,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Erro ao buscar métricas de responsáveis:', error);
        throw new Error(`Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }),

  // Endpoint para buscar todos os responsáveis disponíveis
  getAllAssignees: protectedProcedure
    .query(async () => {
      try {
        const { sanitizeJql } = await import('../jql-sanitizer');
        const jql = sanitizeJql('project in ("RemoteID", "DesktopID", "Mobile ID") and created >= "2025-07-01" order by updated desc');
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
