import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createRetroAction,
  getRetroActionsBySprintId,
  updateRetroAction,
  deleteRetroAction,
  getQualityMetricsBySprintId,
  createQualityMetric,
  updateQualityMetric,
  getBlockingPatterns,
  createBlockingPattern,
  updateBlockingPattern,
} from "../db";

/**
 * Router para operações de retrospectiva
 * Gerencia ações, métricas de qualidade e padrões de bloqueadores
 */
export const retrospectiveRouter = router({
  // Retro Actions
  createAction: protectedProcedure
    .input(
      z.object({
        sprintId: z.number(),
        titulo: z.string(),
        descricao: z.string().optional(),
        responsavel: z.string().optional(),
        prioridade: z.enum(["Baixa", "Média", "Alta"]),
        dataVencimento: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const action = await createRetroAction({
          sprintId: input.sprintId,
          titulo: input.titulo,
          descricao: input.descricao,
          responsavel: input.responsavel,
          status: "Aberta",
          prioridade: input.prioridade,
          dataVencimento: input.dataVencimento,
        });
        return { success: true, action };
      } catch (error) {
        console.error("[Retrospective] Erro ao criar ação:", error);
        throw new Error(
          `Erro ao criar ação: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  getActions: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      try {
        const actions = await getRetroActionsBySprintId(input.sprintId);
        return { success: true, actions };
      } catch (error) {
        console.error("[Retrospective] Erro ao buscar ações:", error);
        throw new Error(
          `Erro ao buscar ações: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  updateActionStatus: protectedProcedure
    .input(
      z.object({
        actionId: z.number(),
        status: z.enum(["Aberta", "Em Progresso", "Concluída", "Cancelada"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const action = await updateRetroAction(input.actionId, {
          status: input.status,
        });
        return { success: true, action };
      } catch (error) {
        console.error("[Retrospective] Erro ao atualizar ação:", error);
        throw new Error(
          `Erro ao atualizar ação: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  deleteAction: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const success = await deleteRetroAction(input.actionId);
        return { success };
      } catch (error) {
        console.error("[Retrospective] Erro ao deletar ação:", error);
        throw new Error(
          `Erro ao deletar ação: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  // Quality Metrics
  getQualityMetrics: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ input }) => {
      try {
        const metrics = await getQualityMetricsBySprintId(input.sprintId);
        return {
          success: true,
          metrics: metrics || {
            totalBugs: 0,
            bugsFixed: 0,
            bugsDeferred: 0,
            testCoverage: 0,
            defectDensity: 0,
          },
        };
      } catch (error) {
        console.error("[Retrospective] Erro ao buscar métricas:", error);
        throw new Error(
          `Erro ao buscar métricas: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  updateQualityMetrics: protectedProcedure
    .input(
      z.object({
        sprintId: z.number(),
        totalBugs: z.number().optional(),
        bugsFixed: z.number().optional(),
        bugsDeferred: z.number().optional(),
        testCoverage: z.number().optional(),
        defectDensity: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await getQualityMetricsBySprintId(input.sprintId);

        if (existing) {
          const updated = await updateQualityMetric(existing.id, {
            totalBugs: input.totalBugs ?? existing.totalBugs,
            bugsFixed: input.bugsFixed ?? existing.bugsFixed,
            bugsDeferred: input.bugsDeferred ?? existing.bugsDeferred,
            testCoverage: input.testCoverage ?? existing.testCoverage,
            defectDensity: input.defectDensity ?? existing.defectDensity,
          });
          return { success: true, metrics: updated };
        } else {
          const created = await createQualityMetric({
            sprintId: input.sprintId,
            totalBugs: input.totalBugs || 0,
            bugsFixed: input.bugsFixed || 0,
            bugsDeferred: input.bugsDeferred || 0,
            testCoverage: input.testCoverage || 0,
            defectDensity: input.defectDensity || 0,
          });
          return { success: true, metrics: created };
        }
      } catch (error) {
        console.error("[Retrospective] Erro ao atualizar métricas:", error);
        throw new Error(
          `Erro ao atualizar métricas: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  // Blocking Patterns
  getBlockingPatterns: protectedProcedure.query(async () => {
    try {
      const patterns = await getBlockingPatterns();
      return { success: true, patterns };
    } catch (error) {
      console.error("[Retrospective] Erro ao buscar padrões:", error);
      throw new Error(
        `Erro ao buscar padrões: ${error instanceof Error ? error.message : "Desconhecido"}`
      );
    }
  }),

  createBlockingPattern: protectedProcedure
    .input(
      z.object({
        padraoNome: z.string(),
        descricao: z.string().optional(),
        frequencia: z.number().default(1),
        impactoTotal: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const pattern = await createBlockingPattern({
          padraoNome: input.padraoNome,
          descricao: input.descricao,
          frequencia: input.frequencia,
          impactoTotal: input.impactoTotal,
          status: "Ativo",
          ultimaOcorrencia: new Date(),
        });
        return { success: true, pattern };
      } catch (error) {
        console.error("[Retrospective] Erro ao criar padrão:", error);
        throw new Error(
          `Erro ao criar padrão: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),

  updateBlockingPattern: protectedProcedure
    .input(
      z.object({
        patternId: z.number(),
        status: z.enum(["Ativo", "Resolvido", "Monitorando"]).optional(),
        frequencia: z.number().optional(),
        impactoTotal: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const pattern = await updateBlockingPattern(input.patternId, {
          status: input.status,
          frequencia: input.frequencia,
          impactoTotal: input.impactoTotal,
          ultimaOcorrencia: input.frequencia ? new Date() : undefined,
        });
        return { success: true, pattern };
      } catch (error) {
        console.error("[Retrospective] Erro ao atualizar padrão:", error);
        throw new Error(
          `Erro ao atualizar padrão: ${error instanceof Error ? error.message : "Desconhecido"}`
        );
      }
    }),
});
