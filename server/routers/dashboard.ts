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
        const { sanitizeJql } = await import('../jql-sanitizer');
        console.log('[Dashboard] JQL ORIGINAL recebido:', JSON.stringify(input.jql));
        console.log('[Dashboard] Comprimento JQL original:', input.jql.length);
        console.log('[Dashboard] Char codes:', Array.from(input.jql).map(c => c.charCodeAt(0)).join(',').substring(0, 200));
        
        const cleanJql = sanitizeJql(input.jql);
        
        console.log("[Dashboard] Buscando métricas com JQL:", cleanJql);
        
        // Buscar issues do Jira usando o JQL sanitizado
        const jiraIssues = await fetchJiraIssuesByJql(cleanJql);
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
        const { sanitizeJql } = await import('../jql-sanitizer');
        const cleanJql = sanitizeJql(input.jql);
        
        console.log("[Dashboard] Buscando issues com JQL:", cleanJql);
        
        const jiraIssues = await fetchJiraIssuesByJql(cleanJql);
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
        const { sanitizeJql } = await import('../jql-sanitizer');
        const cleanJql = sanitizeJql(input.jql);
        
        console.log("[Dashboard] Buscando issues críticas com JQL:", cleanJql);
        
        const jiraIssues = await fetchJiraIssuesByJql(cleanJql);
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
        const { sanitizeJql } = await import('../jql-sanitizer');
        const cleanJql = sanitizeJql(input.jql);
        
        console.log("[Dashboard] Buscando distribuição de status com JQL:", cleanJql);
        
        const jiraIssues = await fetchJiraIssuesByJql(cleanJql);
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
        
        // Importar builders de JQL
        const { buildStatusJql } = await import('../jql-sanitizer');
        
        // Construir JQL com filtro de status de forma segura
        const jqlWithStatus = buildStatusJql(input.jql, input.statuses);
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
        const { sanitizeJql, validateJql } = await import('../jql-sanitizer');
        
        console.log('[Dashboard Activity] JQL ORIGINAL recebido:', JSON.stringify(input.jql));
        console.log('[Dashboard Activity] Comprimento JQL original:', input.jql.length);
        
        // Usar sanitizador centralizado
        let cleanJql = sanitizeJql(input.jql);
        
        console.log('[Dashboard Activity] JQL SANITIZADO:', cleanJql);
        
        // Validar JQL
        const validation = validateJql(cleanJql);
        if (!validation.valid) {
          throw new Error(`JQL inválido: ${validation.error}`);
        }
        
        // Validar JQL - se vazio ou inválido, usar JQL padrão
        if (!cleanJql || cleanJql.length === 0) {
          cleanJql = 'sprint in openSprints() and project = REMOTEID';
        }
        
        // Garantir que o JQL não termina com and/or antes de concatenar
        cleanJql = cleanJql.replace(/\s+(and|or)\s*$/i, '').trim();
        
        // Buscar issues atualizadas nas últimas 24h
        const jqlWithTime = `${cleanJql} and updated >= -1d`;
        console.log('[Dashboard] JQL final completo:', jqlWithTime);
        
        const jiraIssues = await fetchJiraIssuesByJql(jqlWithTime);
        const issues = convertJiraIssuesToDashboard(jiraIssues);
        
        return {
          success: true,
          recentActivity: issues,
          totalCount: issues.length,
          lastFetched: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Dashboard] Erro ao buscar atividade:", error);
        throw new Error(
          `Erro ao buscar atividade: ${error instanceof Error ? error.message : 'Desconhecido'}`
        );
      }
    }),
});
