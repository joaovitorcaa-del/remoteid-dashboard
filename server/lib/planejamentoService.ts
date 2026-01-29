/**
 * Serviço para ler dados da planilha "Planejamento" do Google Sheets
 * Usa a API pública do Google Sheets (não requer autenticação para planilhas públicas)
 */

const SHEET_ID = '1Hd286KdhsA91kDQX7zevHkOPKReTkFianZD7ZT6hWYc';
const SHEET_NAME = 'Planejamento';

export interface PlanejamentoIssue {
  chave: string;
  resumo: string;
  responsavel: string;
  storyPoints: number;
  tipo?: string;
  status?: string;
}

/**
 * Busca dados da planilha Planejamento
 */
export async function fetchPlanejamentoData(): Promise<PlanejamentoIssue[]> {
  try {
    // URL da API do Google Sheets para exportar como CSV
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

    console.log('[Planejamento] Buscando dados de:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar planilha: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      console.warn('[Planejamento] Nenhum dado encontrado na planilha');
      return [];
    }

    console.log(`[Planejamento] ${rows.length} issues encontradas`);
    return rows;
  } catch (error) {
    console.error('[Planejamento] Erro ao buscar dados:', error);
    throw error;
  }
}

/**
 * Parse simples de CSV
 */
function parseCSV(csvText: string): PlanejamentoIssue[] {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    console.warn('[Planejamento] CSV vazio ou sem headers');
    return [];
  }

  // Primeira linha são os headers
  const headers = parseCSVLine(lines[0]);

  console.log('[Planejamento] Headers encontrados:', headers);

  const rows: PlanejamentoIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Mapear campos para o formato esperado
    const issue: PlanejamentoIssue = {
      chave: row['Chave'] || row['chave'] || '',
      resumo: row['Resumo'] || row['resumo'] || '',
      responsavel: row['Responsável'] || row['responsavel'] || '',
      storyPoints: parseInt(row['Story Points'] || row['storyPoints'] || '0'),
      tipo: row['Tipo'] || row['tipo'] || '',
      status: row['Status'] || row['status'] || '',
    };

    // Apenas adicionar se tiver chave
    if (issue.chave) {
      rows.push(issue);
    }
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
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}
