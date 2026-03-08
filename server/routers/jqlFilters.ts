import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createJqlFilter, getJqlFiltersByUserId, getJqlFilterById, updateJqlFilter, deleteJqlFilter } from '../db';

export const jqlFiltersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getJqlFiltersByUserId(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      jql: z.string().min(1),
      descricao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await createJqlFilter({
        userId: ctx.user.id,
        nome: input.nome,
        jql: input.jql,
        descricao: input.descricao,
        ativo: 1,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getJqlFilterById(input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      jql: z.string().optional(),
      descricao: z.string().optional(),
      ativo: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await updateJqlFilter(id, updates);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteJqlFilter(input.id);
    }),
});
