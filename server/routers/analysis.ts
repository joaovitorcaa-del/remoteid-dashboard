import { protectedProcedure, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { fetchJiraIssuesByJql } from '../jira-sync';
import { sanitizeJql } from '../jql-sanitizer';
import { startOfWeek, format, subMonths } from 'date-fns';

export const analysisRouter = {
  // Buscar métricas de produtividade por período
  getProductivityMetrics: protectedProcedure
    .input(
      z.object({
        periodType: z.enum(['sprint', 'month', 'week']),
        assignees: z.array(z.string()).optional(),
        issueTypes: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { periodType, assignees, issueTypes } = input;

        // Construir JQL base
        let jql = 'project IN ("RemoteID", "DesktopID", "Mobile ID")';

        // Adicionar filtro de assignees se fornecido
        if (assignees && assignees.length > 0) {
          const assigneeList = assignees.map(a => `"${a}"`).join(', ');
          jql += ` and assignee in (${assigneeList})`;
        }

        // Adicionar filtro de issue types se fornecido
        if (issueTypes && issueTypes.length > 0) {
          const typeList = issueTypes.map(t => `"${t}"`).join(', ');
          jql += ` and type in (${typeList})`;
        }

        // Adicionar filtro de data (últimos 12 meses)
        const startDate = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
        jql += ` and created >= "${startDate}"`;

        // Sanitizar JQL
        jql = sanitizeJql(jql);

        // Buscar issues do Jira
        const issues = await fetchJiraIssuesByJql(jql);

        // Agrupar issues por período
        const periodMap = new Map<string, any>();

        issues.forEach((issue: any) => {
          const created = new Date(issue.fields.created);
          let periodKey: string;

          if (periodType === 'sprint') {
            // Agrupar por sprint
            const sprint = issue.fields.customfield_10020?.[0];
            periodKey = sprint?.name || 'Sem Sprint';
          } else if (periodType === 'month') {
            // Agrupar por mês
            const month = format(created, 'MMM');
            const year = format(created, 'yyyy');
            periodKey = `${month}/${year}`;
          } else {
            // Agrupar por semana
            const weekStart = startOfWeek(created);
            periodKey = format(weekStart, 'dd/MM/yyyy');
          }

          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              period: periodKey,
              quantity: 0,
              storyPoints: 0,
              byType: {},
            });
          }

          const period = periodMap.get(periodKey);
          period.quantity += 1;

          // Adicionar story points
          const storyPoints = issue.fields.customfield_10028 || issue.fields.customfield_10029 || 0;
          period.storyPoints += storyPoints;

          // Agrupar por tipo
          const issueType = issue.fields.issuetype.name;
          if (!period.byType[issueType]) {
            period.byType[issueType] = { quantity: 0, storyPoints: 0 };
          }
          period.byType[issueType].quantity += 1;
          period.byType[issueType].storyPoints += storyPoints;
        });

        // Converter para array e ordenar
        const periods = Array.from(periodMap.values()).sort((a, b) => {
          if (periodType === 'sprint') {
            return a.period.localeCompare(b.period);
          }
          return new Date(a.period).getTime() - new Date(b.period).getTime();
        });

        return {
          periods,
          totalIssues: issues.length,
          totalStoryPoints: issues.reduce((sum: number, i: any) => sum + (i.fields.customfield_10028 || i.fields.customfield_10029 || 0), 0),
        };
      } catch (error) {
        console.error('Erro ao buscar métricas de produtividade:', error);
        throw new Error(`Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Desconhecido'}`);
      }
    }),

  // Buscar lista de issue types
  getIssueTypes: publicProcedure
    .query(async () => {
      try {
        // Buscar issues para extrair tipos únicos
        const jql = 'project IN ("RemoteID", "DesktopID", "Mobile ID") order by created desc';
        const issues = await fetchJiraIssuesByJql(sanitizeJql(jql));

        const types = new Set<string>();
        issues.forEach((issue: any) => {
          types.add(issue.fields.issuetype.name);
        });

        return Array.from(types).sort();
      } catch (error) {
        console.error('Erro ao buscar issue types:', error);
        return [];
      }
    }),
};
