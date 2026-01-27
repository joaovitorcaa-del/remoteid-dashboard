import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';

const router = Router();

/**
 * Formata um número como moeda
 */
function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

/**
 * Gera um PDF com os dados do dashboard usando pdfkit
 */
function generatePdfFromDashboardData(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // Título
      doc.fontSize(24).font('Helvetica-Bold').text('RemoteID Executive Dashboard', {
        align: 'center',
      });

      doc.fontSize(12).font('Helvetica').text('Relatório Executivo', {
        align: 'center',
      });

      const now = new Date().toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.fontSize(10).text(`Gerado em: ${now}`, {
        align: 'center',
      });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Sumário Executivo
      doc.fontSize(16).font('Helvetica-Bold').text('Sumário Executivo');
      doc.moveDown(0.5);

      if (data?.metrics) {
        const metrics = data.metrics;

        // Tabela de métricas
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 300;
        const rowHeight = 25;
        let currentY = tableTop;

        const metricsData = [
          ['Taxa de Conclusão', `${metrics.completionRate?.toFixed(1) || 0}%`],
          ['Total de Issues', formatNumber(metrics.totalIssues || 0)],
          ['Issues Concluídas', formatNumber(metrics.doneIssues || 0)],
          ['Issues em Progresso', formatNumber(metrics.inProgressIssues || 0)],
          ['Issues Canceladas', formatNumber(metrics.canceledIssues || 0)],
          ['Etapa QA', formatNumber(metrics.qaGargaloCount || 0)],
          ['Dev/Code Review', formatNumber(metrics.devAndCodeReviewCount || 0)],
          ['Backlog', formatNumber(metrics.backlogCount || 0)],
          ['Status do Projeto', metrics.projectHealth || 'Desconhecido'],
        ];

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Métrica', col1X, currentY);
        doc.text('Valor', col2X, currentY);
        currentY += rowHeight;

        doc.moveTo(col1X, currentY - 5).lineTo(550, currentY - 5).stroke();

        doc.font('Helvetica');
        metricsData.forEach((row) => {
          doc.text(row[0], col1X, currentY, { width: 200 });
          doc.text(row[1], col2X, currentY, { width: 200 });
          currentY += rowHeight;
        });

        doc.moveDown();
      }

      // Distribuição por Status
      if (data?.statusDistribution && Array.isArray(data.statusDistribution) && data.statusDistribution.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Distribuição por Status');
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        data.statusDistribution.forEach((item: any) => {
          const status = item.status || item.name;
          const count = item.count || item.value;
          doc.text(`• ${status}: ${formatNumber(count)} issues`);
        });

        doc.moveDown();
      }

      // Issues Críticas
      if (data?.criticalIssues && Array.isArray(data.criticalIssues) && data.criticalIssues.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Issues Críticas');
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        data.criticalIssues.forEach((issue: any, idx: number) => {
          const key = issue.key || issue.id;
          const summary = issue.summary || issue.title;
          doc.text(`${idx + 1}. ${key}: ${summary}`);
          if (issue.description) {
            doc.fontSize(9).text(issue.description, { indent: 20 });
          }
          doc.fontSize(10);
        });

        doc.moveDown();
      }

      // Impedimentos
      if (data?.impediments && Array.isArray(data.impediments) && data.impediments.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Impedimentos');
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        data.impediments.forEach((imp: any, idx: number) => {
          const title = imp.title || imp.name;
          const priority = imp.priority || 'Normal';
          doc.text(`${idx + 1}. ${title} (${priority})`);
          if (imp.description) {
            doc.fontSize(9).text(imp.description, { indent: 20 });
          }
          doc.fontSize(10);
        });

        doc.moveDown();
      }

      // Próximos Passos
      if (data?.dynamicSteps && Array.isArray(data.dynamicSteps) && data.dynamicSteps.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Próximos Passos');
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        data.dynamicSteps.forEach((step: any, idx: number) => {
          const priority = step.priority || 'normal';
          doc.text(`${idx + 1}. ${step.title} (${priority})`);
          if (step.description) {
            doc.fontSize(9).text(step.description, { indent: 20 });
          }
          doc.fontSize(10);
        });

        doc.moveDown();
      }

      // Rodapé
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica').text(
        'Este relatório foi gerado automaticamente pelo RemoteID Dashboard.',
        { align: 'center' }
      );

      doc.text(`Data de Geração: ${now}`, { align: 'center' });
      doc.text(`Última Atualização: ${data?.lastUpdated || 'Desconhecida'}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * POST /api/export/pdf
 * Gera e retorna um PDF com os dados do dashboard
 */
router.post('/pdf', async (req: Request, res: Response) => {
  try {
    const { dashboardData, fileName = 'remoteid-dashboard' } = req.body;

    console.log('Gerando PDF com dados do dashboard usando pdfkit...');

    // Gerar PDF
    const pdfBuffer = await generatePdfFromDashboardData(dashboardData);

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
