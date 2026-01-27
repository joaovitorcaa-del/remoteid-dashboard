import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

/**
 * Gera Markdown formatado a partir dos dados do dashboard
 */
function generateDashboardMarkdown(data: any): string {
  const now = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
| Status do Projeto | ${metrics.projectHealth || 'Desconhecido'} |

`;
  }

  if (data?.statusDistribution && Array.isArray(data.statusDistribution)) {
    markdown += `### Distribuição por Status

`;
    data.statusDistribution.forEach((item: any) => {
      markdown += `- **${item.status || item.name}**: ${item.count || item.value} issues\n`;
    });
    markdown += '\n';
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
      markdown += '\n';
    }
  }

  if (data?.impediments && Array.isArray(data.impediments)) {
    if (data.impediments.length > 0) {
      markdown += `### Impedimentos

`;
      data.impediments.forEach((imp: any, idx: number) => {
        markdown += `${idx + 1}. **${imp.title || imp.name}** (${imp.priority || 'Normal'})\n`;
        if (imp.description) {
          markdown += `   - ${imp.description}\n`;
        }
      });
      markdown += '\n';
    }
  }

  if (data?.dynamicSteps && Array.isArray(data.dynamicSteps)) {
    if (data.dynamicSteps.length > 0) {
      markdown += `### Próximos Passos

`;
      data.dynamicSteps.forEach((step: any, idx: number) => {
        const priority = step.priority || 'normal';
        markdown += `${idx + 1}. **${step.title}** (${priority})\n`;
        if (step.description) {
          markdown += `   - ${step.description}\n`;
        }
      });
      markdown += '\n';
    }
  }

  markdown += `---

## Notas

Este relatório foi gerado automaticamente pelo RemoteID Dashboard.

**Data de Geração**: ${now}  
**Última Atualização**: ${data?.lastUpdated || 'Desconhecida'}

`;

  return markdown;
}

/**
 * Executa manus-md-to-pdf e retorna o buffer do PDF
 */
async function generatePdfFromMarkdown(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempDir = '/tmp';
    const timestamp = Date.now();
    const mdFilePath = path.join(tempDir, `export-${timestamp}.md`);
    const pdfFilePath = path.join(tempDir, `export-${timestamp}.pdf`);

    // Escrever arquivo Markdown temporário
    fs.writeFile(mdFilePath, markdown, 'utf-8')
      .then(() => {
        // Executar manus-md-to-pdf
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
          console.error('Erro ao executar manus-md-to-pdf:', error);
          reject(new Error(`Falha ao executar ferramenta de PDF: ${error.message}`));
        });

        proc.on('close', (code) => {
          if (code !== 0) {
            console.error(`manus-md-to-pdf saiu com código ${code}`);
            console.error('stderr:', stderr);
            console.error('stdout:', stdout);
            reject(new Error(`Falha ao gerar PDF (código ${code}): ${stderr || stdout}`));
          } else {
            // Ler o arquivo PDF gerado
            fs.readFile(pdfFilePath)
              .then((pdfBuffer) => {
                // Limpar arquivos temporários
                Promise.all([
                  fs.unlink(mdFilePath).catch(() => {}),
                  fs.unlink(pdfFilePath).catch(() => {}),
                ]).catch(() => {});

                resolve(pdfBuffer);
              })
              .catch((readError) => {
                reject(new Error(`Erro ao ler arquivo PDF: ${readError.message}`));
              });
          }
        });
      })
      .catch((writeError) => {
        reject(new Error(`Erro ao escrever arquivo Markdown: ${writeError.message}`));
      });
  });
}

/**
 * POST /api/export/pdf
 * Gera e retorna um PDF com os dados do dashboard
 */
router.post('/pdf', async (req: Request, res: Response) => {
  try {
    const { dashboardData, fileName = 'remoteid-dashboard' } = req.body;

    console.log('Gerando PDF com dados do dashboard...');

    // Gerar Markdown
    const markdown = generateDashboardMarkdown(dashboardData);

    // Gerar PDF
    const pdfBuffer = await generatePdfFromMarkdown(markdown);

    // Configurar headers para download
    const timestamp = new Date().toISOString().split('T')[0];
    const downloadFileName = `${fileName}-${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log(`PDF gerado com sucesso: ${downloadFileName} (${pdfBuffer.length} bytes)`);

    // Enviar o PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
