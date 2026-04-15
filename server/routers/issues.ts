import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

export const issuesRouter = router({
  /**
   * Get issues Ready to Sprint from Jira using JQL
   * Busca issues com status "Ready to Sprint" ou "Dev To Do" para planejamento
   */
  getPlanejamento: publicProcedure.query(async () => {
    try {
      const { fetchJiraIssuesByJql } = await import("../jira-sync");
      
      // JQL para buscar issues prontas para planejamento
      // Ordenar por key DESC para trazer as mais recentes primeiro
      const jql = 'project = REMOTEID and (status = "Ready to Sprint" or status = "Dev To Do") order by key desc';
      
      console.log('[Issues] Buscando issues Ready to Sprint com JQL:', jql);
      
      const jiraIssues = await fetchJiraIssuesByJql(jql);
      console.log('[Issues] Issues encontradas:', jiraIssues.length);
      
      // Converter para formato esperado
      const issues = jiraIssues.map((issue: any) => ({
        chave: issue.key,
        resumo: issue.fields?.summary || '',
        responsavel: issue.fields?.assignee?.displayName || 'Não atribuído',
        storyPoints: (issue.fields as any)?.customfield_10016 || 0, // Story Points field
        tipo: (issue.fields as any)?.issuetype?.name || 'Task',
        status: issue.fields?.status?.name || 'Ready to Sprint',
      }));
      
      console.log('[Issues] Issues convertidas:', issues.length);
      return issues;
    } catch (error) {
      console.error("[Issues] Error fetching Planejamento from Jira:", error);
      return [];
    }
  }),

  /**
   * Get issue by key/chave
   */
  getByChave: publicProcedure
    .input(z.object({ chave: z.string() }))
    .query(async ({ input }) => {
      try {
        const { fetchJiraIssuesByJql } = await import("../jira-sync");
        
        const jql = `key = ${input.chave}`;
        const issues = await fetchJiraIssuesByJql(jql);
        
        if (issues.length === 0) {
          return null;
        }
        
        const issue = issues[0];
        return {
          chave: issue.key,
          resumo: issue.fields?.summary || '',
          responsavel: issue.fields?.assignee?.displayName || 'Não atribuído',
          storyPoints: (issue.fields as any)?.customfield_10016 || 0,
          tipo: (issue.fields as any)?.issuetype?.name || 'Task',
          status: issue.fields?.status?.name || 'Ready to Sprint',
        };
      } catch (error) {
        console.error("[Issues] Error fetching issue by chave:", error);
        return null;
      }
    }),
});
