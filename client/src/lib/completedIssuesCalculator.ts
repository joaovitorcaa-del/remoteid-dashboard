import { getConsolidatedSnapshots } from './snapshotService';

export interface CompletedIssue {
  key: string;
  summary: string;
  assignee: string;
  issueType: string;
}

/**
 * Extrair issues concluídas nas últimas 24 horas
 * Compara snapshot de hoje com snapshot de ontem
 */
export function getCompletedIssuesLast24h(allIssues: any[] = []): CompletedIssue[] {
  const snapshots = getConsolidatedSnapshots(7); // Pegar últimos 7 dias

  if (snapshots.length === 0 || allIssues.length === 0) {
    return [];
  }

  // Encontrar o snapshot de 24 horas atrás
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Snapshot mais recente (hoje)
  const todaySnapshot = snapshots[snapshots.length - 1];

  // Encontrar snapshot de ontem (ou mais próximo)
  let yesterdaySnapshot = null;
  for (let i = snapshots.length - 2; i >= 0; i--) {
    const snapshotDate = new Date(snapshots[i].date.split('/').reverse().join('-'));
    if (snapshotDate <= yesterday) {
      yesterdaySnapshot = snapshots[i];
      break;
    }
  }

  if (!yesterdaySnapshot) {
    // Se não houver snapshot de ontem, usar o primeiro disponível
    yesterdaySnapshot = snapshots[0];
  }

  // Calcular quantas issues foram concluídas
  const newIssuesCompleted = todaySnapshot.doneIssues - yesterdaySnapshot.doneIssues;

  if (newIssuesCompleted <= 0) {
    return [];
  }

  // Encontrar as issues que estão em DONE
  const doneIssues = allIssues.filter((issue) => issue.Status === 'DONE');

  // Retornar as últimas N issues concluídas (ordenadas por Updated)
  // Como não temos timestamp exato, vamos retornar as últimas N issues em DONE
  return doneIssues
    .slice(-newIssuesCompleted)
    .map((issue) => ({
      key: issue.Key,
      summary: issue.Summary,
      assignee: issue.Assignee || 'Não atribuído',
      issueType: issue['Issue Type'],
    }));
}
