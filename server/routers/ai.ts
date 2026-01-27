import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';

const DashboardDataSchema = z.object({
  completionRate: z.number(),
  totalIssues: z.number(),
  doneIssues: z.number(),
  inProgressIssues: z.number(),
  canceledIssues: z.number(),
  qaGargaloCount: z.number(),
  devAndCodeReviewCount: z.number(),
  backlogCount: z.number(),
  impedimentsCount: z.number(),
  projectHealth: z.string(),
});

export const aiRouter = router({
  generateInsight: publicProcedure
    .input(DashboardDataSchema)
    .mutation(async ({ input }) => {
      try {
        const context = `
Contexto do Projeto RemoteID:
- Taxa de Conclusão: ${input.completionRate.toFixed(1)}%
- Total de Issues: ${input.totalIssues}
- Issues Concluídas: ${input.doneIssues}
- Issues em Progresso: ${input.inProgressIssues}
- Issues Canceladas: ${input.canceledIssues}
- Etapa QA (Test To Do + Test Doing + STAGING): ${input.qaGargaloCount}
- Em Desenvolvimento/Code Review: ${input.devAndCodeReviewCount}
- Backlog (Ready to Sprint): ${input.backlogCount}
- Impedimentos: ${input.impedimentsCount}
- Status do Projeto: ${input.projectHealth === 'red' ? 'CRÍTICO' : input.projectHealth === 'yellow' ? 'ATENÇÃO' : 'SAUDÁVEL'}
        `;

        const systemPrompt = `Você é um gerente de projetos de TI experiente com profundo conhecimento em metodologias ágeis, gestão de riscos e otimização de processos de desenvolvimento. Sua tarefa é analisar os dados do projeto e fornecer insights executivos acionáveis.`;

        const userPrompt = `${systemPrompt}

Analise o seguinte contexto do projeto e forneça:
1. **Resumo Executivo**: Status geral do projeto em 2-3 linhas
2. **Principais Riscos**: Identifique os 2-3 maiores riscos baseado nos dados
3. **Gargalos Identificados**: Quais são os pontos de estrangulamento no workflow
4. **Recomendações Prioritárias**: 3-4 ações concretas e imediatas para melhorar o progresso
5. **Previsão de Conclusão**: Estimativa realista de quando o projeto será concluído

${context}

Forneça a resposta em formato estruturado e profissional, pronto para apresentação a stakeholders.`;

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        const insight = response.choices[0]?.message?.content || '';

        if (!insight) {
          throw new Error('Nenhuma resposta recebida do modelo de linguagem');
        }

        return {
          success: true,
          insight,
        };
      } catch (error) {
        console.error('[AI Insight Error]', error);
        throw new Error(`Erro ao gerar insight: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }),
});
