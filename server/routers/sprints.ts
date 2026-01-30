import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sprints, sprintIssues, type InsertSprint, type InsertSprintIssue } from "../../drizzle/schema";
import { eq, gte, lte, and } from "drizzle-orm";

export const sprintsRouter = router({
  /**
   * List all sprints
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const allSprints = await db.select().from(sprints).orderBy(sprints.dataInicio);
    return allSprints;
  }),

  /**
   * Get active sprint (current date is within sprint date range)
   */
  getActive: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const activeSprint = await db
      .select()
      .from(sprints)
      .where(
        and(
          lte(sprints.dataInicio, todayString),
          gte(sprints.dataFim, todayString)
        )
      )
      .limit(1);

    return activeSprint.length > 0 ? activeSprint[0] : null;
  }),

  /**
   * Get sprint by ID with its issues
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      const sprint = await db
        .select()
        .from(sprints)
        .where(eq(sprints.id, input.id))
        .limit(1);

      if (sprint.length === 0) {
        return null;
      }

      const issues = await db
        .select()
        .from(sprintIssues)
        .where(eq(sprintIssues.sprintId, input.id))
        .orderBy(sprintIssues.ordem);

      return {
        ...sprint[0],
        issues,
      };
    }),

  /**
   * Create new sprint
   */
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string(),
        dataInicio: z.string(), // YYYY-MM-DD
        dataFim: z.string(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const newSprint: InsertSprint = {
        nome: input.nome,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        ativo: 1,
      };

      await db.insert(sprints).values(newSprint);
      
      // Buscar a Sprint criada para retornar seu ID
      const createdSprint = await db
        .select()
        .from(sprints)
        .where(eq(sprints.nome, input.nome))
        .orderBy(sprints.id)
        .limit(1);

      return { 
        success: true, 
        id: createdSprint[0]?.id 
      };
    }),

  /**
   * Update sprint
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        ativo: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const updateData: Partial<InsertSprint> = {};
      if (input.nome) updateData.nome = input.nome;
      if (input.dataInicio) updateData.dataInicio = input.dataInicio;
      if (input.dataFim) updateData.dataFim = input.dataFim;
      if (input.ativo !== undefined) updateData.ativo = input.ativo;

      await db.update(sprints).set(updateData).where(eq(sprints.id, input.id));
      return { success: true };
    }),

  /**
   * Delete sprint
   */
  delete: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Delete associated issues first
      await db.delete(sprintIssues).where(eq(sprintIssues.sprintId, input.sprintId));

      // Delete sprint
      await db.delete(sprints).where(eq(sprints.id, input.sprintId));
      return { success: true };
    }),

  /**
   * Save issues to sprint
   */
  saveIssues: protectedProcedure
    .input(
      z.object({
        sprintId: z.number(),
        issues: z.array(
          z.object({
            chave: z.string(),
            resumo: z.string(),
            responsavel: z.string(),
            storyPoints: z.number(),
            dataInicio: z.string(), // YYYY-MM-DD
            dataFim: z.string(), // YYYY-MM-DD
            ordem: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Delete existing issues for this sprint
      await db.delete(sprintIssues).where(eq(sprintIssues.sprintId, input.sprintId));

      // Insert new issues
      const newIssues: InsertSprintIssue[] = input.issues.map((issue) => ({
        sprintId: input.sprintId,
        chave: issue.chave,
        resumo: issue.resumo,
        responsavel: issue.responsavel,
        storyPoints: issue.storyPoints,
        dataInicio: issue.dataInicio,
        dataFim: issue.dataFim,
        ordem: issue.ordem,
      }));

      if (newIssues.length > 0) {
        await db.insert(sprintIssues).values(newIssues);
      }

      return { success: true };
    }),

  /**
   * Reactivate a sprint (mark as active)
   */
  reactivate: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Deactivate all other sprints
      await db.update(sprints).set({ ativo: 0 });

      // Activate the selected sprint
      await db.update(sprints).set({ ativo: 1 }).where(eq(sprints.id, input.sprintId));

      return { success: true };
    }),
});

