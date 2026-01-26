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
