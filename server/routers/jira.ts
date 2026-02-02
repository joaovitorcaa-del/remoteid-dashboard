import { protectedProcedure, router } from "../_core/trpc";
import { fetchJiraActiveSprintIssues, convertJiraIssuesToDashboard } from "../jira-sync";
import { getDb } from "../db";
import { sprintIssues, type InsertSprintIssue } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const jiraRouter = router({
  /**
   * Sincroniza issues da sprint ativa do Jira com o banco de dados
   */
  syncActiveSprintIssues: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Buscar issues do Jira
      const jiraIssues = await fetchJiraActiveSprintIssues();
      
      // Converter para formato do dashboard
      const syncedIssues = convertJiraIssuesToDashboard(jiraIssues);
      
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

      // Sincronizar issues
      const insertedIssues = [];
      for (const issue of syncedIssues) {
        // Verificar se issue já existe
        const existing = await db
          .select()
          .from(sprintIssues)
          .where(eq(sprintIssues.chave, issue.chave));

        if (existing.length > 0) {
          // Atualizar issue existente
          await db
            .update(sprintIssues)
            .set({
              status: issue.status,
              responsavel: issue.responsavel,
              dataInicio: issue.dataInicio,
              dataFim: issue.dataFim,
              storyPoints: issue.storyPoints,
            })
            .where(eq(sprintIssues.chave, issue.chave));
        } else {
          // Inserir nova issue
          const newIssue: InsertSprintIssue = {
            sprintId: activeSprint.id,
            chave: issue.chave,
            resumo: issue.resumo,
            status: issue.status,
            responsavel: issue.responsavel,
            dataInicio: issue.dataInicio,
            dataFim: issue.dataFim,
            storyPoints: issue.storyPoints,
          };
          await db.insert(sprintIssues).values(newIssue);
          insertedIssues.push(newIssue);
        }
      }

      return {
        success: true,
        totalSynced: syncedIssues.length,
        newIssues: insertedIssues.length,
        message: `Sincronizadas ${syncedIssues.length} issues (${insertedIssues.length} novas)`,
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
