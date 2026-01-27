import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";

export const exportRouter = router({
  generatePDF: publicProcedure
    .input(
      z.object({
        dashboardData: z.any().optional(),
        fileName: z.string().default("remoteid-dashboard"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { dashboardData, fileName } = input;
        const timestamp = new Date().toISOString().split("T")[0];
        const outputFileName = `${fileName}-${timestamp}.pdf`;

        // Gerar Markdown a partir dos dados do dashboard
        const markdown = generateDashboardMarkdown(dashboardData);

        // Criar arquivo temporário Markdown
        const tempDir = "/tmp";
        const mdFilePath = path.join(tempDir, `${fileName}-${Date.now()}.md`);
        const pdfFilePath = path.join(tempDir, `${fileName}-${Date.now()}.pdf`);

        // Salvar Markdown temporário
        await fs.writeFile(mdFilePath, markdown, "utf-8");

        // Executar manus-md-to-pdf usando spawn
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('manus-md-to-pdf', [mdFilePath, pdfFilePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 30000,
          });

          let stderr = '';
          let stdout = '';

          proc.stdout?.on('data', (data) => {
            stdout += data.toString();
          });

          proc.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('error', (error) => {
            console.error('Erro ao executar manus-md-to-pdf (spawn error):', error);
            reject(new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Falha ao executar ferramenta de PDF: ${error.message}`,
            }));
          });

          proc.on('close', (code) => {
            if (code !== 0) {
              console.error(`manus-md-to-pdf saiu com código ${code}`);
              console.error('stderr:', stderr);
              console.error('stdout:', stdout);
              reject(new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Falha ao gerar PDF (código ${code}): ${stderr || stdout}`,
              }));
            } else {
              console.log('manus-md-to-pdf concluído com sucesso');
              resolve();
            }
          });
        });

        // Ler o arquivo PDF gerado
        const pdfBuffer = await fs.readFile(pdfFilePath);

        // Limpar arquivos temporários
        try {
          await fs.unlink(mdFilePath);
          await fs.unlink(pdfFilePath);
        } catch (err) {
          console.warn("Aviso ao limpar arquivos temporários:", err);
        }

        // Converter buffer para base64 para serialização tRPC
        const base64 = pdfBuffer.toString('base64');
        
        return {
          success: true,
          fileName: outputFileName,
          data: base64,
        };
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao gerar PDF",
        });
      }
    }),
});

/**
 * Gera Markdown formatado a partir dos dados do dashboard
 */
function generateDashboardMarkdown(data: any): string {
  const now = new Date().toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let markdown = `# RemoteID Executive Dashboard

**Relatório Executivo**  
Gerado em: ${now}

---

## Sumário Executivo

`;

  if (data?.metrics) {
    const metrics = data.metrics;

    markdown += `### Métricas Principais

| Métrica | Valor |
|---------|-------|
| Taxa de Conclusão | ${metrics.completionRate?.toFixed(1) || 0}% |
| Total de Issues | ${metrics.totalIssues || 0} |
| Issues Concluídas | ${metrics.doneIssues || 0} |
| Issues em Progresso | ${metrics.inProgressIssues || 0} |
| Issues Canceladas | ${metrics.canceledIssues || 0} |
| Etapa QA | ${metrics.qaGargaloCount || 0} |
| Dev/Code Review | ${metrics.devAndCodeReviewCount || 0} |
| Backlog | ${metrics.backlogCount || 0} |
| Status do Projeto | ${metrics.projectHealth || "Desconhecido"} |

`;
  }

  if (data?.statusDistribution && Array.isArray(data.statusDistribution)) {
    markdown += `### Distribuição por Status

`;
    data.statusDistribution.forEach((item: any) => {
      markdown += `- **${item.status || item.name}**: ${item.count || item.value} issues\n`;
    });
    markdown += "\n";
  }

  if (data?.criticalIssues && Array.isArray(data.criticalIssues)) {
    if (data.criticalIssues.length > 0) {
      markdown += `### Issues Críticas

`;
      data.criticalIssues.forEach((issue: any, idx: number) => {
        markdown += `${idx + 1}. **${issue.key || issue.id}**: ${issue.summary || issue.title}\n`;
        if (issue.description) {
          markdown += `   - ${issue.description}\n`;
        }
      });
      markdown += "\n";
    }
  }

  if (data?.impediments && Array.isArray(data.impediments)) {
    if (data.impediments.length > 0) {
      markdown += `### Impedimentos

`;
      data.impediments.forEach((imp: any, idx: number) => {
        markdown += `${idx + 1}. **${imp.title || imp.name}** (${imp.priority || "Normal"})\n`;
        if (imp.description) {
          markdown += `   - ${imp.description}\n`;
        }
      });
      markdown += "\n";
    }
  }

  if (data?.nextSteps && Array.isArray(data.nextSteps)) {
    if (data.nextSteps.length > 0) {
      markdown += `### Próximos Passos

`;
      data.nextSteps.forEach((step: any, idx: number) => {
        const priority = step.priority || "normal";
        markdown += `${idx + 1}. **${step.title}** (${priority})\n`;
        if (step.description) {
          markdown += `   - ${step.description}\n`;
        }
      });
      markdown += "\n";
    }
  }

  markdown += `---

## Notas

Este relatório foi gerado automaticamente pelo RemoteID Dashboard.

**Data de Geração**: ${now}  
**Última Atualização**: ${data?.lastUpdated || "Desconhecida"}

`;

  return markdown;
}
