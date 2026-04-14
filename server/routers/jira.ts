import { protectedProcedure, router } from "../_core/trpc";
import { fetchJiraActiveSprintIssues, fetchJiraBacklogIssues, convertJiraIssuesToDashboard } from "../jira-sync";
import { getDb } from "../db";
import { sprintIssues, type InsertSprintIssue } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const jiraRouter = router({
  /**
   * Sincroniza apenas as issues já planejadas (salvas em sprintIssues) com dados do Jira
   */
  syncActiveSprintIssues: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      console.log('[Sync] Iniciando sincronização com Jira...');
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

      console.log('[Sync] Sprints ativas encontradas:', activeSprints.length);
      if (activeSprints.length === 0) {
        console.log('[Sync] Nenhuma sprint ativa encontrada - retornando sucesso');
        return {
          success: true,
          totalSynced: 0,
          plannedIssues: 0,
          message: 'Nenhuma sprint ativa para sincronizar',
        };
      }

      const activeSprint = activeSprints[0];
      console.log('[Sync] Sprint ativa:', activeSprint.nome, 'ID:', activeSprint.id);

      // Buscar issues já planejadas na sprint ativa
      const plannedIssues = await db
        .select()
        .from(sprintIssues)
        .where(eq(sprintIssues.sprintId, activeSprint.id));

      console.log('[Sync] Issues planejadas encontradas:', plannedIssues.length);
      console.log('[Sync] Chaves planejadas:', plannedIssues.map(i => i.chave).join(', '));

      if (plannedIssues.length === 0) {
        console.log('[Sync] Nenhuma issue planejada nesta sprint - retornando sucesso');
        return {
          success: true,
          totalSynced: 0,
          plannedIssues: 0,
          message: 'Nenhuma issue planejada para sincronizar',
        };
      }

      // Buscar issues do Jira
      console.log('[Sync] Buscando issues do Jira...');
      const jiraIssues = await fetchJiraActiveSprintIssues();
      console.log('[Sync] Issues do Jira encontradas:', jiraIssues.length);
      
      // Converter para formato do dashboard
      const syncedIssues = convertJiraIssuesToDashboard(jiraIssues);
      console.log('[Sync] Issues convertidas:', syncedIssues.map(i => ({ chave: i.chave, status: i.status })));

      // Sincronizar apenas as issues que estao planejadas
      let updatedCount = 0;
      const plannedChaves = plannedIssues.map(i => i.chave);
      
      for (const issue of syncedIssues) {
        // Verificar se esta issue está planejada
        if (plannedChaves.includes(issue.chave)) {
          console.log(`[Sync] Atualizando ${issue.chave} com status: ${issue.status}`);
          // Atualizar APENAS o status do Jira
          // Preservar todos os outros campos: responsavel, storyPoints, dataInicio, dataFim
          // Isso garante que as datas planejadas e barras do Gantt continuem visiveis
          const validStatus = ['Ready to Sprint', 'Dev to Do', 'Code Doing', 'Code Review', 'Test to Do', 'Test Doing', 'Staging', 'Done', 'Cancelled'].includes(issue.status)
            ? (issue.status as any)
            : 'Ready to Sprint';
          await db
            .update(sprintIssues)
            .set({ status: validStatus })
            .where(eq(sprintIssues.chave, issue.chave));
          console.log(`[Sync] ${issue.chave} atualizada com sucesso`);
          updatedCount++;
        }
      }

      console.log(`[Sync] Sincronização concluída: ${updatedCount} de ${plannedIssues.length} issues atualizadas`);

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
   * Busca issues do Backlog do Jira
   */
  getBacklogIssues: protectedProcedure.query(async () => {
    try {
      console.log('[Backlog] Buscando issues do backlog do Jira...');
      const jiraIssues = await fetchJiraBacklogIssues();
      console.log('[Backlog] Issues encontradas:', jiraIssues.length);
      
      // Converter para formato do dashboard
      const backlogIssues = convertJiraIssuesToDashboard(jiraIssues);
      console.log('[Backlog] Issues convertidas:', backlogIssues.length);

      return {
        success: true,
        issues: backlogIssues,
        totalCount: backlogIssues.length,
      };
    } catch (error) {
      console.error('Erro ao buscar backlog:', error);
      throw new Error(`Erro ao buscar backlog: ${error instanceof Error ? error.message : 'Desconhecido'}`);
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

  /**
   * Obtém métricas de tarefas agrupadas por desenvolvedor
   */
  getDeveloperMetrics: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log('[DeveloperMetrics] Buscando métricas por desenvolvedor...');
      const db = await getDb();
      if (!db) {
        throw new Error('Banco de dados não disponível');
      }

      // Buscar todas as issues
      const allIssues = await db.select().from(sprintIssues);
      console.log('[DeveloperMetrics] Total de issues encontradas:', allIssues.length);

      // Agrupar por responsável
      const developerMap = new Map<string, any>();

      for (const issue of allIssues) {
        const developer = issue.responsavel || 'Não Atribuído';
        
        if (!developerMap.has(developer)) {
          developerMap.set(developer, {
            name: developer,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            totalStoryPoints: 0,
            storyPointsCount: 0,
            tasksByType: {} as Record<string, number>,
            tasksByStatus: {} as Record<string, number>,
            tasksBySprint: {} as Record<string, number>,
          });
        }

        const devMetrics = developerMap.get(developer)!;
        devMetrics.totalTasks++;

        // Contar por status
        if (issue.status === 'Done') {
          devMetrics.completedTasks++;
        } else if (['Code Doing', 'Code Review', 'Test Doing'].includes(issue.status)) {
          devMetrics.inProgressTasks++;
        }

        // Contar story points
        if (issue.storyPoints && issue.storyPoints > 0) {
          devMetrics.totalStoryPoints += issue.storyPoints;
          devMetrics.storyPointsCount++;
        }

        // Agrupar por tipo (usar resumo como tipo de issue)
        const issueType = 'Task'; // Padrão já que o schema não tem campo tipo
        devMetrics.tasksByType[issueType] = (devMetrics.tasksByType[issueType] || 0) + 1;

        // Agrupar por status
        devMetrics.tasksByStatus[issue.status] = (devMetrics.tasksByStatus[issue.status] || 0) + 1;

        // Agrupar por sprint
        if (issue.sprintId) {
          const sprintName = `Sprint ${issue.sprintId}`;
          devMetrics.tasksBySprint[sprintName] = (devMetrics.tasksBySprint[sprintName] || 0) + 1;
        }
      }

      // Converter para array e calcular métricas
      const developers = Array.from(developerMap.values()).map(dev => ({
        name: dev.name,
        totalTasks: dev.totalTasks,
        completedTasks: dev.completedTasks,
        inProgressTasks: dev.inProgressTasks,
        totalStoryPoints: dev.totalStoryPoints,
        averageStoryPoints: dev.storyPointsCount > 0 ? dev.totalStoryPoints / dev.storyPointsCount : 0,
        completionRate: dev.totalTasks > 0 ? (dev.completedTasks / dev.totalTasks) * 100 : 0,
        tasksByType: dev.tasksByType,
        tasksByStatus: dev.tasksByStatus,
        tasksBySprint: dev.tasksBySprint,
      }));

      // Calcular resumo geral
      const totalTasks = developers.reduce((sum, d) => sum + d.totalTasks, 0);
      const totalCompleted = developers.reduce((sum, d) => sum + d.completedTasks, 0);
      const totalStoryPoints = developers.reduce((sum, d) => sum + d.totalStoryPoints, 0);

      const summary = {
        totalTasks,
        totalDevelopers: developers.length,
        averageCompletionRate: totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0,
        totalStoryPoints,
      };

      console.log('[DeveloperMetrics] Métricas calculadas:', summary);

      return {
        developers: developers.sort((a, b) => b.totalTasks - a.totalTasks),
        summary,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao buscar métricas de desenvolvedor:', error);
      throw new Error(`Erro ao buscar métricas: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  }),
});
