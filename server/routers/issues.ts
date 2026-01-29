import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fetchPlanejamentoData } from "../lib/planejamentoService";

export const issuesRouter = router({
  /**
   * Get issues from "Planejamento" Google Sheet
   * Uses the public Google Sheets API
   */
  getPlanejamento: publicProcedure.query(async () => {
    try {
      const issues = await fetchPlanejamentoData();
      return issues;
    } catch (error) {
      console.error("[Issues] Error fetching Planejamento sheet:", error);
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
        const issues = await fetchPlanejamentoData();
        const issue = issues.find(i => i.chave === input.chave);
        return issue || null;
      } catch (error) {
        console.error("[Issues] Error fetching issue by chave:", error);
        return null;
      }
    }),
});
