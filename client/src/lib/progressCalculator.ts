import { getConsolidatedSnapshots } from './snapshotService';

/**
 * Calcular quantas issues foram concluídas nas últimas 24 horas
 */
export function calculateProgress24h(): {
  newIssuesCompleted: number;
  trend: 'up' | 'down' | 'stable';
} {
  const snapshots = getConsolidatedSnapshots(7); // Pegar últimos 7 dias

  if (snapshots.length === 0) {
    return { newIssuesCompleted: 0, trend: 'stable' };
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

  // Calcular diferença
  const newIssuesCompleted = todaySnapshot.doneIssues - yesterdaySnapshot.doneIssues;

  // Determinar trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (newIssuesCompleted > 0) {
    trend = 'up';
  } else if (newIssuesCompleted < 0) {
    trend = 'down';
  }

  return {
    newIssuesCompleted: Math.max(0, newIssuesCompleted), // Nunca retornar negativo
    trend,
  };
}
