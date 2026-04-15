import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface SyncStatus {
  id: number;
  jql: string;
  totalIssues: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  issuesInDb: number;
}

interface AnalysisContextType {
  // JQL customizado para a página Análise
  analysisJql: string;
  setAnalysisJql: (jql: string) => void;
  resetAnalysisJql: () => void;
  defaultAnalysisJql: string;

  // Sync
  isSyncing: boolean;
  syncData: () => Promise<void>;
  syncStatus: SyncStatus | null;

  // Dados do banco
  issues: any[];
  issuesLoading: boolean;

  // Métricas
  velocityData: any;
  capacityData: any;
  throughputData: any;
  cycleTimeData: any;
  cumulativeFlowData: any;
  distributions: any;

  // Loading states
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Refetch
  refreshData: () => Promise<void>;
}

const DEFAULT_ANALYSIS_JQL = 'project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01" ORDER BY priority DESC';

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisJql, setAnalysisJqlState] = useState<string>(DEFAULT_ANALYSIS_JQL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar JQL do localStorage
  useEffect(() => {
    const savedJql = localStorage.getItem('analysisCustomJql');
    if (savedJql) {
      setAnalysisJqlState(savedJql);
    }
    setIsInitialized(true);
  }, []);

  // Queries ao banco (dados persistidos)
  const syncStatusQuery = trpc.analysis.getSyncStatus.useQuery(undefined, {
    enabled: isInitialized,
  });

  const issuesQuery = trpc.analysis.getIssues.useQuery(undefined, {
    enabled: isInitialized,
  });

  const velocityQuery = trpc.analysis.getVelocityMetrics.useQuery(undefined, {
    enabled: isInitialized,
  });

  const capacityQuery = trpc.analysis.getCapacityMetrics.useQuery(undefined, {
    enabled: isInitialized,
  });

  const throughputQuery = trpc.analysis.getThroughput.useQuery(undefined, {
    enabled: isInitialized,
  });

  const cycleTimeQuery = trpc.analysis.getCycleTimeMetrics.useQuery(undefined, {
    enabled: isInitialized,
  });

  const cumulativeFlowQuery = trpc.analysis.getCumulativeFlow.useQuery(undefined, {
    enabled: isInitialized,
  });

  const distributionsQuery = trpc.analysis.getDistributions.useQuery(undefined, {
    enabled: isInitialized,
  });

  // Mutation de sync
  const syncMutation = trpc.analysis.syncJiraData.useMutation();

  // Função de sync - busca do JIRA e persiste no banco
  const syncData = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await syncMutation.mutateAsync({ jql: analysisJql });
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));

      // Refetch todos os dados do banco
      await Promise.all([
        syncStatusQuery.refetch(),
        issuesQuery.refetch(),
        velocityQuery.refetch(),
        capacityQuery.refetch(),
        throughputQuery.refetch(),
        cycleTimeQuery.refetch(),
        cumulativeFlowQuery.refetch(),
        distributionsQuery.refetch(),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      setError(msg);
      console.error('[AnalysisContext] Erro sync:', msg);
    } finally {
      setIsSyncing(false);
    }
  }, [analysisJql, syncMutation, syncStatusQuery, issuesQuery, velocityQuery, capacityQuery, throughputQuery, cycleTimeQuery, cumulativeFlowQuery, distributionsQuery]);

  // Refresh = refetch dados do banco (sem sync do JIRA)
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([
        syncStatusQuery.refetch(),
        issuesQuery.refetch(),
        velocityQuery.refetch(),
        capacityQuery.refetch(),
        throughputQuery.refetch(),
        cycleTimeQuery.refetch(),
        cumulativeFlowQuery.refetch(),
        distributionsQuery.refetch(),
      ]);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(msg);
    }
  }, [syncStatusQuery, issuesQuery, velocityQuery, capacityQuery, throughputQuery, cycleTimeQuery, cumulativeFlowQuery, distributionsQuery]);

  const setAnalysisJql = (jql: string) => {
    setAnalysisJqlState(jql);
    localStorage.setItem('analysisCustomJql', jql);
  };

  const resetAnalysisJql = () => {
    setAnalysisJqlState(DEFAULT_ANALYSIS_JQL);
    localStorage.removeItem('analysisCustomJql');
  };

  const loading = isSyncing || issuesQuery.isLoading;

  return (
    <AnalysisContext.Provider
      value={{
        analysisJql,
        setAnalysisJql,
        resetAnalysisJql,
        defaultAnalysisJql: DEFAULT_ANALYSIS_JQL,
        isSyncing,
        syncData,
        syncStatus: syncStatusQuery.data as SyncStatus | null,
        issues: issuesQuery.data || [],
        issuesLoading: issuesQuery.isLoading,
        velocityData: velocityQuery.data || null,
        capacityData: capacityQuery.data || null,
        throughputData: throughputQuery.data || null,
        cycleTimeData: cycleTimeQuery.data || null,
        cumulativeFlowData: cumulativeFlowQuery.data || null,
        distributions: distributionsQuery.data || null,
        loading,
        error,
        lastUpdated,
        refreshData,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis deve ser usado dentro de AnalysisProvider');
  }
  return context;
}
