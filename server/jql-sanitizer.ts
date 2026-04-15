/**
 * Sanitizador centralizado de JQL
 * Garante que todo JQL enviado para o Jira está correto
 */

/**
 * Sanitiza e valida JQL antes de enviar para o Jira
 * - Remove quebras de linha e espaços extras
 * - Converte operadores em maiúsculas para minúsculas
 * - Valida sintaxe básica
 * - Remove caracteres especiais perigosos
 */
export function sanitizeJql(jql: string): string {
  if (!jql || typeof jql !== 'string') {
    return '';
  }

  // 1. Remover quebras de linha, tabs e espaços extras
  let cleaned = jql
    .replace(/[\r\n\t]+/g, ' ')  // Quebras de linha e tabs
    .replace(/\s+/g, ' ')         // Múltiplos espaços
    .trim();

  // 2. Remover AND/OR/NOT duplicados no final
  cleaned = cleaned.replace(/\s+(and|or|not)\s*$/i, '');

  // 3. Converter operadores para minúsculas (Jira JQL é case-insensitive para operadores)
  // Mas vamos manter minúsculas por consistência
  cleaned = cleaned
    .replace(/\bAND\b/g, 'and')
    .replace(/\bOR\b/g, 'or')
    .replace(/\bNOT\b/g, 'not')
    .replace(/\bIN\b/g, 'in')
    .replace(/\bIS\b/g, 'is')
    .replace(/\bEMPTY\b/g, 'empty')
    .replace(/\bORDER\s+BY\b/gi, 'order by')
    .replace(/\bASC\b/g, 'asc')
    .replace(/\bDESC\b/g, 'desc');

  // 4. Garantir espaço após vírgulas em listas (importante para IN)
  cleaned = cleaned.replace(/,(?!\s)/g, ', ');

  // 5. Validar que não há caracteres perigosos
  // Remover caracteres de controle
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  // 6. Validar parênteses balanceados
  let openParens = 0;
  for (const char of cleaned) {
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (openParens < 0) {
      console.warn('[JQL Sanitizer] Parênteses desbalanceados detectados');
      break;
    }
  }

  // 7. Validar que não termina com operador
  if (/\s+(and|or|not)\s*$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\s+(and|or|not)\s*$/i, '');
  }

  // 8. Reorganizar ORDER BY para o final (Jira requer que ORDER BY seja sempre o último)
  const orderByMatch = cleaned.match(/\s+order\s+by\s+(.+?)(?=\s+and|\s+or|$)/i);
  if (orderByMatch) {
    // Remover order by do meio
    cleaned = cleaned.replace(/\s+order\s+by\s+.+?(?=\s+and|\s+or|$)/i, '');
    // Remover espaços extras
    cleaned = cleaned.trim();
    // Adicionar order by no final
    cleaned = `${cleaned} order by ${orderByMatch[1].trim()}`;
  }

  console.log('[JQL Sanitizer] JQL original:', jql);
  console.log('[JQL Sanitizer] JQL sanitizado:', cleaned);

  return cleaned;
}

/**
 * Valida se um JQL é válido antes de enviar
 */
export function validateJql(jql: string): { valid: boolean; error?: string } {
  if (!jql || jql.trim().length === 0) {
    return { valid: false, error: 'JQL não pode estar vazio' };
  }

  // Verificar parênteses balanceados
  let openParens = 0;
  for (const char of jql) {
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (openParens < 0) {
      return { valid: false, error: 'Parênteses desbalanceados' };
    }
  }

  if (openParens !== 0) {
    return { valid: false, error: 'Parênteses desbalanceados' };
  }

  // Verificar que não termina com operador
  if (/\s+(and|or|not)\s*$/i.test(jql)) {
    return { valid: false, error: 'JQL não pode terminar com operador' };
  }

  // Verificar que não tem aspas desbalanceadas
  const doubleQuotes = (jql.match(/"/g) || []).length;
  const singleQuotes = (jql.match(/'/g) || []).length;

  if (doubleQuotes % 2 !== 0) {
    return { valid: false, error: 'Aspas duplas desbalanceadas' };
  }

  if (singleQuotes % 2 !== 0) {
    return { valid: false, error: 'Aspas simples desbalanceadas' };
  }

  return { valid: true };
}

/**
 * Constrói um JQL seguro para buscar por assignees
 */
export function buildAssigneeJql(baseJql: string, assignees: string[]): string {
  if (!assignees || assignees.length === 0) {
    return sanitizeJql(baseJql);
  }

  // Escapar aspas em nomes de assignees
  const escapedAssignees = assignees.map(a => {
    // Se o nome já tem aspas, remover
    let cleaned = a.replace(/^["']|["']$/g, '');
    // Adicionar aspas duplas
    return `"${cleaned}"`;
  });

  // Construir filtro de assignees
  const assigneeFilter = `assignee in (${escapedAssignees.join(', ')})`;

  // Combinar com JQL base
  let combined = `${baseJql} and ${assigneeFilter}`;

  return sanitizeJql(combined);
}

/**
 * Constrói um JQL seguro para buscar por statuses
 */
export function buildStatusJql(baseJql: string, statuses: string[]): string {
  if (!statuses || statuses.length === 0) {
    return sanitizeJql(baseJql);
  }

  // Escapar aspas em status
  const escapedStatuses = statuses.map(s => {
    // Se o status já tem aspas, remover
    let cleaned = s.replace(/^["']|["']$/g, '');
    // Adicionar aspas simples (Jira prefere simples para status)
    return `'${cleaned}'`;
  });

  // Construir filtro de status
  const statusFilter = `status in (${escapedStatuses.join(', ')})`;

  // Combinar com JQL base
  let combined = `${baseJql} and ${statusFilter}`;

  return sanitizeJql(combined);
}

/**
 * Constrói um JQL seguro para buscar por período
 */
export function buildDateRangeJql(baseJql: string, startDate: string, endDate: string): string {
  if (!startDate || !endDate) {
    return sanitizeJql(baseJql);
  }

  // Validar formato de data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    console.warn('[JQL Builder] Datas em formato inválido');
    return sanitizeJql(baseJql);
  }

  // Construir filtro de período
  const dateFilter = `updated >= ${startDate} and updated <= ${endDate}`;

  // Combinar com JQL base
  let combined = `${baseJql} and ${dateFilter}`;

  return sanitizeJql(combined);
}
