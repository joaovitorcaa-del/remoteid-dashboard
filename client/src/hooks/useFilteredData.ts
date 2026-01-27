import { useFilter } from '@/contexts/FilterContext';
import { DashboardMetrics, StatusDistribution, CriticalIssue } from '@/data/dashboardData';
import { calculateProgress24h } from '@/lib/progressCalculator';

export interface FilteredData {
  metrics: DashboardMetrics;
  statusDistribution: StatusDistribution[];
  criticalIssues: CriticalIssue[];
  devIssues: any[];
}

/**
 * Hook para aplicar filtro por Issue Type aos dados do dashboard
 */
export function useFilteredData(
  originalMetrics: DashboardMetrics,
  originalStatusDistribution: StatusDistribution[],
  originalCriticalIssues: CriticalIssue[],
  allIssues: any[] = []
): FilteredData {
  const { selectedIssueType } = useFilter();
  const { newIssuesCompleted, trend } = calculateProgress24h();

  // Se não há filtro selecionado, retornar dados originais
  if (!selectedIssueType) {
    const devStatuses = ['Dev To Do', 'CODE DOING', 'CODE REVIEW', 'Dev Doing'];
    const allDevIssues = allIssues.filter((issue) => devStatuses.includes(issue.Status));
    return {
      metrics: {
        ...originalMetrics,
        progressLast24h: newIssuesCompleted,
        progressLast24hTrend: trend,
      },
      statusDistribution: originalStatusDistribution,
      criticalIssues: originalCriticalIssues,
      devIssues: allDevIssues,
    };
  }

  // Filtrar issues pelo tipo selecionado
  const filteredIssues = allIssues.filter((issue) => issue['Issue Type'] === selectedIssueType);

  // Recalcular métricas baseado no filtro
  const filteredDone = filteredIssues.filter((i) => i.Status === 'DONE').length;
  const filteredTotal = filteredIssues.length;
  const filteredInProgress = filteredIssues.filter((i) => i.Status !== 'DONE' && i.Status !== 'Canceled').length;
  const filteredCanceled = filteredIssues.filter((i) => i.Status === 'Canceled').length;

  const filteredCompletionRate = filteredTotal > 0 ? (filteredDone / filteredTotal) * 100 : 0;

  // Recalcular distribuição de status
  const statusTypeCount: { [key: string]: { bugs: number; improvements: number; tests: number } } = {};
  
  filteredIssues.forEach((issue) => {
    const status = issue.Status;
    const issueType = issue['Issue Type'];
    
    if (!statusTypeCount[status]) {
      statusTypeCount[status] = { bugs: 0, improvements: 0, tests: 0 };
    }
    
    if (issueType === 'Bug') {
      statusTypeCount[status].bugs++;
    } else if (issueType === 'Improvement') {
      statusTypeCount[status].improvements++;
    } else if (issueType === 'Tests') {
      statusTypeCount[status].tests++;
    }
  });

  const filteredStatusDistribution: StatusDistribution[] = Object.entries(statusTypeCount).map(([status, counts]) => ({
    status,
    bugs: counts.bugs,
    improvements: counts.improvements,
    tests: counts.tests,
    total: counts.bugs + counts.improvements + counts.tests,
  }));

  // Filtrar issues críticas
  const filteredCriticalIssues = originalCriticalIssues.filter(
    (issue) => filteredIssues.some((fi) => fi.Key === issue.key)
  );

  // Filtrar issues em desenvolvimento
  const devStatuses = ['Dev To Do', 'CODE DOING', 'CODE REVIEW', 'Dev Doing'];
  const filteredDevIssues = filteredIssues.filter((issue) => devStatuses.includes(issue.Status));

  // Calcular Gargalo QA (issues em status de teste)
  const qaStatuses = ['Test To Do', 'Test Doing', 'STAGING'];
  const filteredQAGargalo = filteredIssues.filter((issue) => qaStatuses.includes(issue.Status));
  const filteredQAGargaloCount = filteredQAGargalo.length;
  const filteredQAStatusesList = Array.from(new Set(filteredQAGargalo.map((issue) => issue.Status)));

  // Retornar dados filtrados
  return {
    metrics: {
      ...originalMetrics,
      completionRate: filteredCompletionRate,
      totalIssues: filteredTotal,
      doneIssues: filteredDone,
      canceledIssues: filteredCanceled,
      inProgressIssues: filteredInProgress,
      qaGargaloCount: filteredQAGargaloCount,
      qaStatuses: filteredQAStatusesList,
      progressLast24h: newIssuesCompleted,
      progressLast24hTrend: trend,
    },
    statusDistribution: filteredStatusDistribution,
    criticalIssues: filteredCriticalIssues,
    devIssues: filteredDevIssues,
  };
}
