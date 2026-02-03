import { protectedProcedure, router } from "../_core/trpc";
import { fetchJiraActiveSprintIssues, convertJiraIssuesToDashboard } from "../jira-sync";
import { getDb } from "../db";
import { sprintIssues, type InsertSprintIssue } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const jiraRouter = router({
  /**
   * Sincroniza apenas as issues já planejadas (salvas em sprintIssues) com dados do Jira
   */
  syncActiveSprintIssues: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Obter banco de dados
      const db = await getDb();
      if (!db) {
        throw new Error('Banco de dados não disponível');
      }

      // Buscar sprint ativa
      const { sprints } = await import('../../drizzle/schema');
      const activeSprints = await db
        .select()
        .from(sprints)
        .where(eq(sprints.ativo, 1));

      if (activeSprints.length === 0) {
        throw new Error('Nenhuma sprint ativa encontrada');
      }

      const activeSprint = activeSprints[0];

      // Buscar issues já planejadas na sprint ativa
      const plannedIssues = await db
        .select()
        .from(sprintIssues)
        .where(eq(sprintIssues.sprintId, activeSprint.id));

      if (plannedIssues.length === 0) {
        throw new Error('Nenhuma issue planejada nesta sprint');
      }

      // Buscar issues do Jira
      const jiraIssues = await fetchJiraActiveSprintIssues();
      
      // Converter para formato do dashboard
      const syncedIssues = convertJiraIssuesToDashboard(jiraIssues);

      // Sincronizar apenas as issues que estão planejadas
      let updatedCount = 0;
      const plannedChaves = plannedIssues.map(i => i.chave);
      
      for (const issue of syncedIssues) {
        // Verificar se esta issue está planejada
        if (plannedChaves.includes(issue.chave)) {
          // Encontrar a issue planejada original
          const plannedIssue = plannedIssues.find(p => p.chave === issue.chave);
          
          // Preparar dados para atualização
          const updateData: any = {
            status: issue.status,
            responsavel: issue.responsavel,
            storyPoints: issue.storyPoints,
            epicKey: issue.epicKey,
            epicSummary: issue.epicSummary,
          };
          
          // Preservar dataInicio e dataFim planejadas (não sobrescrever com dados do Jira)
          // Isso garante que as barras do Gantt continuem visíveis após sync
          if (plannedIssue?.dataInicio) {
            updateData.dataInicio = plannedIssue.dataInicio;
          } else {
            updateData.dataInicio = issue.dataInicio;
          }
          
          if (plannedIssue?.dataFim) {
            updateData.dataFim = plannedIssue.dataFim;
          } else {
            updateData.dataFim = issue.dataFim;
          }
          
          await db
            .update(sprintIssues)
            .set(updateData)
            .where(eq(sprintIssues.chave, issue.chave));
          updatedCount++;
        }
      }

      return {
        success: true,
        totalSynced: updatedCount,
        plannedIssues: plannedIssues.length,
        message: `Sincronizadas ${updatedCount} de ${plannedIssues.length} issues planejadas`,
      };
    } catch (error) {
      console.error('Erro ao sincronizar com Jira:', error);
      throw new Error(`Erro ao sincronizar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  }),

  /**
   * Obtém o status da última sincronização
   */
  getLastSyncStatus: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return { status: 'error', message: 'Banco de dados não disponível' };
      }

      // Buscar sprint ativa
      const { sprints } = await import('../../drizzle/schema');
      const activeSprints = await db
        .select()
        .from(sprints)
        .where(eq(sprints.ativo, 1));

      if (activeSprints.length === 0) {
        return { status: 'no_active_sprint', message: 'Nenhuma sprint ativa' };
      }

      const activeSprint = activeSprints[0];

      // Contar issues na sprint
      const issuesCount = await db
        .select()
        .from(sprintIssues)
        .where(eq(sprintIssues.sprintId, activeSprint.id));

      return {
        status: 'ok',
        sprintName: activeSprint.nome,
        issuesCount: issuesCount.length,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }),
});
