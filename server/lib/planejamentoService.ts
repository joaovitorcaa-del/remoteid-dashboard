/**
 * Serviço para ler dados da planilha "Planejamento" do Google Sheets
 * Usa a API gviz/tq que funciona com planilhas públicas
 */

const SHEET_ID = '1Hd286KdhsA91kDQX7zevHkOPKReTkFianZD7ZT6hWYc';

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
    // URL da API gviz/tq que funciona com planilhas públicas
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

    console.log('[Planejamento] Buscando dados de:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error('[Planejamento] Erro HTTP:', response.status, response.statusText);
      throw new Error(`Erro ao buscar planilha: ${response.statusText}`);
    }

    const csvText = await response.text();

    console.log('[Planejamento] CSV recebido, tamanho:', csvText.length);

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
 * Parse de CSV
 * Mapeia as colunas da planilha para o formato esperado
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

  // Encontrar índices das colunas
  const keyIndex = headers.findIndex(h => h.toLowerCase().includes('key'));
  const summaryIndex = headers.findIndex(h => h.toLowerCase().includes('summary'));
  const assigneeIndex = headers.findIndex(h => h.toLowerCase().includes('assignee'));
  const storyPointsIndex = headers.findIndex(h => h.toLowerCase().includes('story points'));
  const typeIndex = headers.findIndex(h => h.toLowerCase().includes('issue type'));
  const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));

  console.log('[Planejamento] Índices:', {
    key: keyIndex,
    summary: summaryIndex,
    assignee: assigneeIndex,
    storyPoints: storyPointsIndex,
    type: typeIndex,
    status: statusIndex
  });

  const rows: PlanejamentoIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);

    if (values.length === 0) continue;

    const chave = keyIndex >= 0 ? values[keyIndex] : '';
    
    // Apenas adicionar se tiver chave
    if (chave) {
      const issue: PlanejamentoIssue = {
        chave: chave,
        resumo: summaryIndex >= 0 ? values[summaryIndex] : '',
        responsavel: assigneeIndex >= 0 ? values[assigneeIndex] : '',
        storyPoints: storyPointsIndex >= 0 ? parseInt(values[storyPointsIndex]) || 0 : 0,
        tipo: typeIndex >= 0 ? values[typeIndex] : '',
        status: statusIndex >= 0 ? values[statusIndex] : '',
      };

      console.log('[Planejamento] Issue adicionada:', issue.chave, '-', issue.resumo);
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
