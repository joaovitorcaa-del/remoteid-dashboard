import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DashboardMetrics, StatusDistribution, CriticalIssue } from '@/data/dashboardData';
import { saveSnapshot, cleanOldSnapshots } from '@/lib/snapshotService';
import { useFilter } from './FilterContext';
import { trpc } from '@/lib/trpc';

interface DashboardContextType {
  metrics: DashboardMetrics;
  statusDistribution: StatusDistribution[];
  criticalIssues: CriticalIssue[];
  impediments: any[];
  backlogItems: any[];
  allIssues: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { activeJqlFilter } = useFilter();
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    projectHealth: 'red',
    completionRate: 62.4,
    progressLast24h: 0,
    qaGargaloCount: 25,
    qaStatuses: ['Test To Do', 'Test Doing', 'STAGING'],
    devAndCodeReviewCount: 6,
    totalIssues: 125,
    doneIssues: 78,
  });

  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>([]);
  const [impediments, setImpediments] = useState<any[]>([]);
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // tRPC queries
  const metricsQuery = trpc.dashboard.getMetricsByJql.useQuery(
    { jql: activeJqlFilter?.jql || '' },
    { enabled: !!activeJqlFilter?.jql }
  );

  const statusDistributionQuery = trpc.dashboard.getStatusDistributionByJql.useQuery(
    { jql: activeJqlFilter?.jql || '' },
    { enabled: !!activeJqlFilter?.jql }
  );

  const criticalIssuesQuery = trpc.dashboard.getCriticalIssuesByJql.useQuery(
    { jql: activeJqlFilter?.jql || '' },
    { enabled: !!activeJqlFilter?.jql }
  );

  const activityQuery = trpc.dashboard.getActivityByJql.useQuery(
    { jql: activeJqlFilter?.jql || '' },
    { enabled: false } // Desabilitar temporariamente para debugar
  );

  // Atualizar estado quando queries retornam dados
  useEffect(() => {
    if (metricsQuery.data?.metrics) {
      setMetrics(metricsQuery.data.metrics);
      setAllIssues(metricsQuery.data.issues || []);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    }
  }, [metricsQuery.data]);

  useEffect(() => {
    if (statusDistributionQuery.data?.statusDistribution) {
      const formatted: StatusDistribution[] = statusDistributionQuery.data.statusDistribution.map(item => ({
        status: item.status,
        bugs: Math.floor((item.count || 0) * 0.3),
        improvements: Math.floor((item.count || 0) * 0.4),
        tests: Math.floor((item.count || 0) * 0.3),
        total: item.count || 0,
      }));
      setStatusDistribution(formatted);
    }
  }, [statusDistributionQuery.data]);

  useEffect(() => {
    if (criticalIssuesQuery.data?.criticalIssues) {
      const formatted: CriticalIssue[] = criticalIssuesQuery.data.criticalIssues.map(issue => ({
        key: issue.chave,
        summary: issue.resumo,
        status: issue.status,
        impact: 'high',
      }));
      setCriticalIssues(formatted);
    }
  }, [criticalIssuesQuery.data]);

  const refreshData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
          // Refetch todas as queries com timeout de 10 segundos
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao buscar dados')), 10000)
          );
          
          await Promise.race([
            Promise.all([
              metricsQuery.refetch(),
              statusDistributionQuery.refetch(),
              criticalIssuesQuery.refetch(),
              activityQuery.refetch(),
            ]),
            timeoutPromise,
          ]);

      // Salvar snapshot
      await saveSnapshot({
        completionRate: metrics.completionRate,
        totalIssues: metrics.totalIssues,
        doneIssues: metrics.doneIssues,
        inProgressIssues: metrics.inProgressIssues || 0,
        qaGargaloCount: metrics.qaGargaloCount,
        impedimentsCount: impediments.length,
      });

      // Limpar snapshots antigos
      cleanOldSnapshots();

      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar dados';
      setError(errorMessage);
      console.error('Erro ao atualizar dados:', err);
      // Não dispara novo refetch em caso de erro para evitar loop infinito
    } finally {
      setLoading(false);
    }
  }, [metrics, impediments.length, metricsQuery, statusDistributionQuery, criticalIssuesQuery, activityQuery]);

  // Auto-refresh quando o filtro JQL mudar (apenas uma vez na inicialização)
  useEffect(() => {
    if (activeJqlFilter?.jql && !isInitialized) {
      setIsInitialized(true);
      refreshData();
    }
  }, [activeJqlFilter?.jql, isInitialized, refreshData]);

  // Função para refetch manual (chamada pelo botão "Atualizar Dados")
  const manualRefresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return (
    <DashboardContext.Provider
      value={{
        metrics,
        statusDistribution,
        criticalIssues,
        impediments,
        backlogItems,
        allIssues,
        loading: loading || metricsQuery.isLoading,
        error,
        lastUpdated,
        refreshData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard deve ser usado dentro de DashboardProvider');
  }
  return context;
}
