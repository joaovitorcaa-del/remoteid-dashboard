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
        startDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { periodType, assignees, issueTypes } = input;

        // Usar JQL correto fornecido
        let jql = 'project IN ("RemoteID", "DesktopID", "Mobile ID")';

        // Adicionar filtro de data (usar 2025-07-01 como padrão)
        jql += ' and created >= "2025-07-01"';

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

        // Adicionar ordenação por prioridade
        jql += ' order by priority desc';

        // Sanitizar JQL
        jql = sanitizeJql(jql);
        
        // LOG: Expor JQL e resultado
        console.log('\n=== ANÁLISE DEBUG ===');
        console.log('JQL ENVIADO:', jql);

        // Buscar issues do Jira
        const issues = await fetchJiraIssuesByJql(jql);
        
        console.log('TOTAL DE ISSUES RETORNADAS:', issues.length);
        console.log('PRIMEIRAS 5 ISSUES:', issues.slice(0, 5).map((i: any) => ({
          key: i.key,
          type: i.fields.issuetype?.name,
          storyPoints: i.fields.customfield_10028 || i.fields.customfield_10029,
          created: i.fields.created
        })));
        console.log('=== FIM DEBUG ===\n');
        
        // Usar todas as issues retornadas (sem limite)
        const limitedIssues = issues;

        // Agrupar issues por período
        const periodMap = new Map<string, any>();

        limitedIssues.forEach((issue: any) => {
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
          const issueType = issue.fields.issuetype?.name || 'Desconhecido';
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
        totalIssues: limitedIssues.length,
        totalStoryPoints: limitedIssues.reduce((sum: number, i: any) => sum + (i.fields.customfield_10028 || i.fields.customfield_10029 || 0), 0),
      };
      } catch (error) {
        console.error('Erro ao buscar métricas de produtividade:', error);
        throw new Error(`Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Desconhecido'}`);
      }
    }),

  // DEBUG: Expor JQL e resultado
  debugProductivityQuery: publicProcedure
    .input(
      z.object({
        periodType: z.enum(['sprint', 'month', 'week']).optional(),
        assignees: z.array(z.string()).optional(),
        issueTypes: z.array(z.string()).optional(),
        startDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { assignees, issueTypes } = input;

        // Usar JQL correto fornecido
        let jql = 'project IN ("RemoteID", "DesktopID", "Mobile ID")';
        jql += ' and created >= "2025-07-01"';

        if (assignees && assignees.length > 0) {
          const assigneeList = assignees.map(a => `"${a}"`).join(', ');
          jql += ` and assignee in (${assigneeList})`;
        }

        if (issueTypes && issueTypes.length > 0) {
          const typeList = issueTypes.map(t => `"${t}"`).join(', ');
          jql += ` and type in (${typeList})`;
        }

        jql += ' order by priority desc';
        jql = sanitizeJql(jql);

        const issues = await fetchJiraIssuesByJql(jql);

        return {
          jqlEnviado: jql,
          totalIssues: issues.length,
          primeiras5Issues: issues.slice(0, 5).map((i: any) => ({
            key: i.key,
            summary: i.fields.summary,
            type: i.fields.issuetype?.name,
            status: i.fields.status?.name,
            storyPoints: i.fields.customfield_10028 || i.fields.customfield_10029 || 0,
            created: i.fields.created,
            assignee: i.fields.assignee?.displayName || 'Sem atribuição'
          })),
          distribuicaoPorTipo: issues.reduce((acc: any, i: any) => {
            const type = i.fields.issuetype?.name || 'Desconhecido';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {}),
          distribuicaoPorStatus: issues.reduce((acc: any, i: any) => {
            const status = i.fields.status?.name || 'Desconhecido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          totalStoryPoints: issues.reduce((sum: number, i: any) => sum + (i.fields.customfield_10028 || i.fields.customfield_10029 || 0), 0)
        };
      } catch (error) {
        return {
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    }),

  // Buscar lista de issue types
  getIssueTypes: publicProcedure
    .query(async () => {
      try {
        // Buscar issues para extrair tipos únicos
        const jql = 'project IN ("RemoteID", "DesktopID", "Mobile ID") order by created desc';
        const issues = await fetchJiraIssuesByJql(sanitizeJql(jql));
        const limitedIssues = issues.slice(0, 100);

        const types = new Set<string>();
        limitedIssues.forEach((issue: any) => {
          const issueType = issue.fields.issuetype?.name || 'Desconhecido';
          types.add(issueType);
        });

        return Array.from(types).sort();
      } catch (error) {
        console.error('Erro ao buscar issue types:', error);
        return [];
      }
    }),
};
