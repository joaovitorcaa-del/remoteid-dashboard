import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { fetchJiraIssuesByJql, convertJiraIssuesToDashboard } from "../jira-sync";

/**
 * Router para operações de dashboard que usam JQL como filtro
 * Substitui a dependência de Google Sheets
 */
export const dashboardRouter = router({
  /**
   * Busca métricas do dashboard filtrando por JQL
   * Retorna: total, concluídas, em progresso, canceladas, etc.
   */
  getMetricsByJql: protectedProcedure
    .input(z.object({ jql: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando métricas com JQL:", input.jql);
        
        // Buscar issues do Jira usando o JQL fornecido
        const jiraIssues = await fetchJiraIssuesByJql(input.jql);
        console.log("[Dashboard] Issues encontradas:", jiraIssues.length);
        
        // Converter para formato do dashboard
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        // Calcular métricas
        const totalIssues = issues.length;
        const doneIssues = issues.filter(i => i.status === 'Done').length;
        const inProgressIssues = issues.filter(i => 
          ['Dev to Do', 'Code Doing', 'Code Review', 'Test to Do', 'Test Doing', 'Staging'].includes(i.status)
        ).length;
        const canceledIssues = issues.filter(i => i.status === 'Cancelled').length;
        const readyToSprintIssues = issues.filter(i => i.status === 'Ready to Sprint').length;
        
        // Calcular taxa de conclusão
        const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;
        
        // Calcular QA gargalo
        const qaStatuses = ['Test to Do', 'Test Doing', 'Staging'];
        const qaGargaloCount = issues.filter(i => qaStatuses.includes(i.status)).length;
        
        // Calcular Dev e Code Review
        const devAndCodeReviewCount = issues.filter(i => 
          ['Code Doing', 'Code Review'].includes(i.status)
        ).length;
        
        // Determinar saúde do projeto
        let projectHealth: 'green' | 'yellow' | 'red' = 'green';
        if (completionRate < 50) {
          projectHealth = 'red';
        } else if (completionRate < 75) {
          projectHealth = 'yellow';
        }
        
        return {
          success: true,
          metrics: {
            projectHealth,
            completionRate,
            progressLast24h: 0,
            qaGargaloCount,
            qaStatuses,
            devAndCodeReviewCount,
            readyToSprintCount: readyToSprintIssues,
            totalIssues,
            doneIssues,
            canceledIssues,
            inProgressIssues,
          },
          issues,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar métricas:", error);
        throw new Error(
          `Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),

  /**
   * Busca issues filtrando por JQL
   * Retorna lista completa de issues com todos os detalhes
   */
  getIssuesByJql: protectedProcedure
    .input(z.object({ jql: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando issues com JQL:", input.jql);
        
        const jiraIssues = await fetchJiraIssuesByJql(input.jql);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        return {
          success: true,
          issues,
          totalCount: issues.length,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar issues:", error);
        throw new Error(
          `Erro ao buscar issues: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),

  /**
   * Busca issues críticas (bloqueadores) filtrando por JQL
   */
  getCriticalIssuesByJql: protectedProcedure
    .input(z.object({ jql: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando issues críticas com JQL:", input.jql);
        
        const jiraIssues = await fetchJiraIssuesByJql(input.jql);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        // Filtrar apenas issues críticas (bloqueadores)
        const criticalIssues = issues.filter(i => 
          i.status !== 'Done' && 
          i.status !== 'Ready to Sprint'
        );
        
        return {
          success: true,
          criticalIssues,
          totalCount: criticalIssues.length,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar issues críticas:", error);
        throw new Error(
          `Erro ao buscar issues críticas: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),

  /**
   * Busca distribuição de status filtrando por JQL
   */
  getStatusDistributionByJql: protectedProcedure
    .input(z.object({ jql: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando distribuição de status com JQL:", input.jql);
        
        const jiraIssues = await fetchJiraIssuesByJql(input.jql);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        // Agrupar por status
        const statusMap = new Map<string, number>();
        issues.forEach(issue => {
          const status = issue.status || 'Unknown';
          statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        
        const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count,
          percentage: Math.round((count / issues.length) * 100),
        }));
        
        return {
          success: true,
          statusDistribution,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar distribuição de status:", error);
        throw new Error(
          `Erro ao buscar distribuição: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),

  /**
   * Busca issues por status específico filtrando por JQL
   * Usado pelos modais para exibir listas de issues
   */
  getIssuesByStatus: protectedProcedure
    .input(z.object({ jql: z.string(), statuses: z.array(z.string()) }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando issues por status com JQL:", input.jql);
        
        // Limpar JQL
        const cleanJql = input.jql.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
        
        // Construir JQL com filtro de status
        // Em Jira JQL, status com espaços devem estar entre aspas simples
        const statusFilter = input.statuses.map(s => `'${s}'`).join(', ');
        const jqlWithStatus = `${cleanJql} AND status in (${statusFilter})`;
        console.log("[Dashboard] JQL com status:", jqlWithStatus);
        
        const jiraIssues = await fetchJiraIssuesByJql(jqlWithStatus);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        return {
          success: true,
          issues,
          totalCount: issues.length,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar issues por status:", error);
        throw new Error(
          `Erro ao buscar issues: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),

  /**
   * Busca atividade das últimas 24h filtrando por JQL
   */
  getActivityByJql: protectedProcedure
    .input(z.object({ jql: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log("[Dashboard] Buscando atividade com JQL:", input.jql);
        console.log("[Dashboard] JQL length:", input.jql.length);
        console.log("[Dashboard] JQL char codes:", Array.from(input.jql).map(c => c.charCodeAt(0)).join(','));
        
        // Limpar JQL: remover quebras de linha, espaços extras e caracteres especiais
        let cleanJql = input.jql
          .trim()
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Remover AND/OR duplicados no final
        cleanJql = cleanJql.replace(/\s+(AND|OR)\s*$/i, '');
        
        // Validar JQL - se vazio ou inválido, usar JQL padrão
        if (!cleanJql || cleanJql.length === 0) {
          cleanJql = 'sprint in openSprints() AND project = REMOTEID';
        }
        
        // Garantir que o JQL não termina com AND/OR antes de concatenar
        cleanJql = cleanJql.replace(/\s+(AND|OR)\s*$/i, '').trim();
        
        // Buscar issues atualizadas nas últimas 24h
        const jqlWithTime = `${cleanJql} AND updated >= -1d`;
        console.log("[Dashboard] JQL final:", jqlWithTime);
        
        const jiraIssues = await fetchJiraIssuesByJql(jqlWithTime);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        return {
          success: true,
          recentActivity: issues,
          totalCount: issues.length,
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar atividade:", error);
        throw new Error(
          `Erro ao buscar atividade: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),
});
