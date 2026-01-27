/**
 * Serviço para gerenciar snapshots diários no Google Sheets
 * Salva e recupera histórico de métricas do projeto
 */

export interface Snapshot {
  date: string;
  time: string;
  completionRate: number;
  totalIssues: number;
  doneIssues: number;
  inProgressIssues: number;
  qaGargaloCount: number;
  impedimentsCount: number;
}

const SHEET_ID = '1EMe-TgcDeKT586VkKfaYndXmqDAqEWQAV743MWIGF5c';
const SNAPSHOTS_SHEET_NAME = 'Snapshots';

/**
 * Salvar snapshot das métricas atuais
 */
export async function saveSnapshot(metrics: {
  completionRate: number;
  totalIssues: number;
  doneIssues: number;
  inProgressIssues: number;
  qaGargaloCount: number;
  impedimentsCount: number;
}): Promise<boolean> {
  try {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR');

    // Preparar dados para enviar
    const data = {
      date,
      time,
      completionRate: metrics.completionRate,
      totalIssues: metrics.totalIssues,
      doneIssues: metrics.doneIssues,
      inProgressIssues: metrics.inProgressIssues,
      qaGargaloCount: metrics.qaGargaloCount,
      impedimentsCount: metrics.impedimentsCount,
    };

    // Usar Google Sheets API para adicionar linha
    // Como não temos backend, vamos usar uma abordagem alternativa:
    // Salvar em localStorage e exibir opção de exportar
    const snapshots = getLocalSnapshots();
    snapshots.push(data);
    localStorage.setItem('remoteid_snapshots', JSON.stringify(snapshots));

    console.log('Snapshot salvo:', data);
    return true;
  } catch (error) {
    console.error('Erro ao salvar snapshot:', error);
    return false;
  }
}

/**
 * Recuperar snapshots do localStorage
 */
export function getLocalSnapshots(): Snapshot[] {
  try {
    const stored = localStorage.getItem('remoteid_snapshots');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao recuperar snapshots:', error);
    return [];
  }
}

/**
 * Recuperar snapshots dos últimos N dias
 */
export function getSnapshotsLastDays(days: number): Snapshot[] {
  const snapshots = getLocalSnapshots();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return snapshots.filter((snapshot) => {
    const snapshotDate = new Date(snapshot.date.split('/').reverse().join('-'));
    return snapshotDate >= cutoffDate;
  });
}

/**
 * Consolidar snapshots por dia, mantendo apenas o último de cada dia
 */
export function getConsolidatedSnapshots(days: number = 30): Snapshot[] {
  const snapshots = getSnapshotsLastDays(days);
  
  if (snapshots.length === 0) {
    return [];
  }

  const groupedByDate: { [key: string]: Snapshot[] } = {};
  
  snapshots.forEach((snapshot) => {
    if (!groupedByDate[snapshot.date]) {
      groupedByDate[snapshot.date] = [];
    }
    groupedByDate[snapshot.date].push(snapshot);
  });

  const consolidated: Snapshot[] = [];
  
  Object.keys(groupedByDate).forEach((date) => {
    const snapshotsOfDay = groupedByDate[date];
    snapshotsOfDay.sort((a, b) => b.time.localeCompare(a.time));
    consolidated.push(snapshotsOfDay[0]);
  });

  consolidated.sort((a, b) => {
    const dateA = new Date(a.date.split('/').reverse().join('-'));
    const dateB = new Date(b.date.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });

  return consolidated;
}

/**
 * Limpar snapshots antigos (mais de 90 dias)
 */
export function cleanOldSnapshots(): void {
  try {
    const snapshots = getLocalSnapshots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const filtered = snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.date.split('/').reverse().join('-'));
      return snapshotDate >= cutoffDate;
    });

    localStorage.setItem('remoteid_snapshots', JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao limpar snapshots antigos:', error);
  }
}

/**
 * Exportar snapshots como CSV
 */
export function exportSnapshotsAsCSV(): string {
  const snapshots = getLocalSnapshots();

  if (snapshots.length === 0) {
    return 'Nenhum snapshot disponível';
  }

  // Cabeçalho
  const headers = [
    'Data',
    'Hora',
    'Taxa de Conclusão (%)',
    'Total de Issues',
    'Issues Concluídas',
    'Issues em Progresso',
    'Gargalo QA',
    'Impedimentos',
  ];

  // Linhas
  const rows = snapshots.map((snapshot) => [
    snapshot.date,
    snapshot.time,
    snapshot.completionRate,
    snapshot.totalIssues,
    snapshot.doneIssues,
    snapshot.inProgressIssues,
    snapshot.qaGargaloCount,
    snapshot.impedimentsCount,
  ]);

  // Montar CSV
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  return csv;
}

/**
 * Fazer download do CSV
 */
export function downloadSnapshotsCSV(): void {
  const csv = exportSnapshotsAsCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `remoteid-snapshots-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Calcular velocidade média (issues/dia)
 */
export function calculateAverageVelocity(days: number = 7): number {
  const snapshots = getSnapshotsLastDays(days);

  if (snapshots.length < 2) {
    return 0;
  }

  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];

  const issuesCompleted = lastSnapshot.doneIssues - firstSnapshot.doneIssues;
  const daysElapsed = snapshots.length;

  return issuesCompleted / Math.max(daysElapsed, 1);
}

/**
 * Prever data de conclusão baseada em velocidade
 */
export function predictCompletionDate(
  totalIssues: number,
  doneIssues: number,
  days: number = 7
): Date | null {
  const velocity = calculateAverageVelocity(days);

  if (velocity <= 0) {
    return null;
  }

  const remainingIssues = totalIssues - doneIssues;
  const daysRemaining = remainingIssues / velocity;

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysRemaining);

  return completionDate;
}

/**
 * Calcular taxa de conclusão semanal
 */
export function calculateWeeklyCompletionRate(): {
  currentWeek: number;
  previousWeek: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
} {
  const snapshots = getConsolidatedSnapshots(14); // Últimas 2 semanas

  if (snapshots.length === 0) {
    return {
      currentWeek: 0,
      previousWeek: 0,
      trend: 'stable',
      percentageChange: 0,
    };
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Snapshots da semana atual
  const currentWeekSnapshots = snapshots.filter((snapshot) => {
    const snapshotDate = new Date(snapshot.date.split('/').reverse().join('-'));
    return snapshotDate >= sevenDaysAgo;
  });

  // Snapshots da semana anterior
  const previousWeekSnapshots = snapshots.filter((snapshot) => {
    const snapshotDate = new Date(snapshot.date.split('/').reverse().join('-'));
    return snapshotDate >= fourteenDaysAgo && snapshotDate < sevenDaysAgo;
  });

  const currentWeekRate =
    currentWeekSnapshots.length > 0
      ? currentWeekSnapshots[currentWeekSnapshots.length - 1].completionRate
      : 0;

  const previousWeekRate =
    previousWeekSnapshots.length > 0
      ? previousWeekSnapshots[previousWeekSnapshots.length - 1].completionRate
      : 0;

  const percentageChange = currentWeekRate - previousWeekRate;
  let trend: 'up' | 'down' | 'stable' = 'stable';

  if (percentageChange > 1) {
    trend = 'up';
  } else if (percentageChange < -1) {
    trend = 'down';
  }

  return {
    currentWeek: Math.round(currentWeekRate),
    previousWeek: Math.round(previousWeekRate),
    trend,
    percentageChange: Math.round(percentageChange * 10) / 10,
  };
}
