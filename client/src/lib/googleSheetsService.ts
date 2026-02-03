/**
 * Serviço para ler dados do Google Sheets
 * Usa a API pública do Google Sheets (não requer autenticação para planilhas públicas)
 */

const SHEET_ID = '1EMe-TgcDeKT586VkKfaYndXmqDAqEWQAV743MWIGF5c';
const SHEET_NAME = 'Página 1';

export interface SheetRow {
  'Issue Type': string;
  Key: string;
  Summary: string;
  Status: string;
  Assignee?: string;
  Updated?: string;
  Flagged?: string;
}

/**
 * Converte dados do Google Sheets em formato CSV
 */
export async function fetchGoogleSheetData(): Promise<SheetRow[]> {
  try {
    // URL da API do Google Sheets para exportar como CSV
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar planilha: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // Parse CSV
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    return rows;
  } catch (error) {
    console.error('Erro ao buscar dados do Google Sheets:', error);
    throw error;
  }
}

/**
 * Parse simples de CSV
 */
function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return [];
  }

  // Primeira linha são os headers
  const headers = parseCSVLine(lines[0]);
  
  const rows: SheetRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row as SheetRow);
  }

  return rows;
}

/**
 * Parse de uma linha CSV (considerando aspas)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Aspas escapadas
        current += '"';
        i++;
      } else {
        // Toggle quotes
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Fim do campo
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Último campo
  result.push(current.trim());

  return result;
}

/**
 * Processa os dados brutos do Sheets e calcula as métricas
 */
export function processSheetData(rows: SheetRow[]) {
  const metrics = {
    totalIssues: rows.length,
    doneIssues: 0,
    canceledIssues: 0,
    inProgressIssues: 0,
    completionRate: 0,
    progressLast24h: 0,
    qaGargaloCount: 0,
    qaStatuses: ['Test To Do', 'Test Doing', 'STAGING'] as string[],
    devAndCodeReviewCount: 0,
    readyToSprintCount: 0,
    backlogCount: 0,
    projectHealth: 'green' as 'red' | 'yellow' | 'green',
    criticalIssues: [] as any[],
    impediments: [] as any[],
    backlogItems: [] as any[],
    statusDistribution: {} as any,
  };

  const doneStatuses = ['Done', 'Concluído', 'Closed', 'Finalizado', 'DONE'];
  const canceledStatuses = ['Canceled', 'Cancelado', 'Cancelled'];
  const qaStatuses = ['Test To Do', 'Test Doing', 'STAGING'];
  const devStatuses = ['Dev To Do', 'CODE DOING', 'CODE REVIEW'];
  const readyToSprintStatuses = ['Ready to Sprint', 'READY TO SPRINT', 'Dev To Do'];
  const backlogStatuses = ['READY TO SPRINT', 'OPENED'];

  // Contar issues por status
  const statusCount: { [key: string]: number } = {};
  const statusIssueTypeCount: { [key: string]: { bugs: number; improvements: number; tests: number } } = {};

  rows.forEach((row) => {
    const status = row.Status || 'Unknown';
    const issueType = row['Issue Type'] || 'Unknown';

    // Contar por status
    statusCount[status] = (statusCount[status] || 0) + 1;

    // Contar por tipo de issue
    if (!statusIssueTypeCount[status]) {
      statusIssueTypeCount[status] = { bugs: 0, improvements: 0, tests: 0 };
    }

    if (issueType.toLowerCase().includes('bug')) {
      statusIssueTypeCount[status].bugs++;
    } else if (issueType.toLowerCase().includes('improvement')) {
      statusIssueTypeCount[status].improvements++;
    } else if (issueType.toLowerCase().includes('test')) {
      statusIssueTypeCount[status].tests++;
    }

    // Contar issues concluídas
    if (doneStatuses.includes(status)) {
      metrics.doneIssues++;
    }

    // Contar issues canceladas
    if (canceledStatuses.includes(status)) {
      metrics.canceledIssues++;
    }

    // Contar gargalo QA
    if (qaStatuses.includes(status)) {
      metrics.qaGargaloCount++;
    }

    // Contar Dev/Code Review
    if (devStatuses.includes(status)) {
      metrics.devAndCodeReviewCount++;
    }

    // Contar Ready to Sprint ou Dev To Do
    if (readyToSprintStatuses.includes(status)) {
      metrics.readyToSprintCount++;
    }

    // Contar Backlog (Ready to Sprint)
    if (backlogStatuses.includes(status)) {
      metrics.backlogCount++;
      metrics.backlogItems.push({
        key: row.Key,
        summary: row.Summary,
        issueType: row['Issue Type'],
        status: status,
      });
    }

    // Identificar issues críticas
    if (row.Summary && (row.Summary.toLowerCase().includes('bloqueador') || row.Summary.toLowerCase().includes('crítico'))) {
      metrics.criticalIssues.push({
        key: row.Key,
        status: status,
        summary: row.Summary,
        impact: 'critical' as const,
      });
    }

    // Identificar impedimentos
    if (row.Flagged && row.Flagged.toLowerCase().includes('impediment')) {
      metrics.impediments.push({
        key: row.Key,
        status: status,
        summary: row.Summary,
        flagged: row.Flagged,
        impact: 'critical' as const,
      });
    }
  });

  // Calcular issues em progresso (excluindo concluídas e canceladas)
  metrics.inProgressIssues = metrics.totalIssues - metrics.doneIssues - metrics.canceledIssues;

  // Calcular taxa de conclusão
  metrics.completionRate = metrics.totalIssues > 0 
    ? Math.round((metrics.doneIssues / metrics.totalIssues) * 100 * 10) / 10
    : 0;

  // Determinar saúde do projeto
  if (metrics.completionRate < 50) {
    metrics.projectHealth = 'red';
  } else if (metrics.completionRate < 75) {
    metrics.projectHealth = 'yellow';
  } else {
    metrics.projectHealth = 'green';
  }

  // Construir distribuição de status
  metrics.statusDistribution = Object.entries(statusIssueTypeCount).map(([status, counts]) => ({
    status,
    bugs: counts.bugs,
    improvements: counts.improvements,
    tests: counts.tests,
    total: counts.bugs + counts.improvements + counts.tests,
  }));

  return metrics;
}
