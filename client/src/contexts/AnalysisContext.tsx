import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
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

export interface AnalysisFilters {
  issueTypes: string[];
  projects: string[];
  assignees: string[];
  statuses: string[];
  spMin: number | undefined;
  spMax: number | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}

interface AnalysisContextType {
  // JQL customizado para a página Análise
  analysisJql: string;
  setAnalysisJql: (jql: string) => void;
  resetAnalysisJql: () => void;
  defaultAnalysisJql: string;

  // Filtros interativos
  filters: AnalysisFilters;
  setFilters: (filters: Partial<AnalysisFilters>) => void;
  resetFilters: () => void;

  // Opções de filtro disponíveis
  availableIssueTypes: string[];
  availableProjects: string[];
  availableAssignees: string[];
  availableStatuses: string[];

  // Sync
  isSyncing: boolean;
  syncData: () => Promise<void>;
  syncStatus: SyncStatus | null;

  // Dados do banco (já filtrados)
  issues: any[];
  filteredIssues: any[];
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

const DEFAULT_FILTERS: AnalysisFilters = {
  issueTypes: [],
  projects: [],
  assignees: [],
  statuses: [],
  spMin: undefined,
  spMax: undefined,
  startDate: undefined,
  endDate: undefined,
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisJql, setAnalysisJqlState] = useState<string>(DEFAULT_ANALYSIS_JQL);
  const [filters, setFiltersState] = useState<AnalysisFilters>(DEFAULT_FILTERS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar JQL e filtros do localStorage
  useEffect(() => {
    const savedJql = localStorage.getItem('analysisCustomJql');
    if (savedJql) {
      setAnalysisJqlState(savedJql);
    }
    const savedFilters = localStorage.getItem('analysisFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFiltersState({ ...DEFAULT_FILTERS, ...parsed });
      } catch (e) {
        // ignore
      }
    }
    setIsInitialized(true);
  }, []);

  // Estabilizar input de filtros para queries do servidor (sem assignees/statuses/sp - filtrados no frontend)
  const serverFilterInput = useMemo(() => ({
    issueTypes: filters.issueTypes.length > 0 ? filters.issueTypes : undefined,
    projects: filters.projects.length > 0 ? filters.projects : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters.issueTypes, filters.projects, filters.startDate, filters.endDate]);

  // Opções de filtro disponíveis (sem filtros aplicados)
  const issueTypesQuery = trpc.analysis.getIssueTypes.useQuery(undefined, {
    enabled: isInitialized,
  });

  const projectsQuery = trpc.analysis.getProjects.useQuery(undefined, {
    enabled: isInitialized,
  });

  const assigneesQuery = trpc.analysis.getAssignees.useQuery(undefined, {
    enabled: isInitialized,
  });

  // Buscar status disponíveis
  const statusesQuery = trpc.analysis.getStatuses.useQuery(undefined, {
    enabled: isInitialized,
  });

  // Queries ao banco com filtros de servidor
  const syncStatusQuery = trpc.analysis.getSyncStatus.useQuery(undefined, {
    enabled: isInitialized,
  });

  const issuesQuery = trpc.analysis.getIssues.useQuery(
    serverFilterInput.issueTypes || serverFilterInput.projects || serverFilterInput.startDate || serverFilterInput.endDate
      ? {
          issueTypes: serverFilterInput.issueTypes,
          projects: serverFilterInput.projects,
          startDate: serverFilterInput.startDate,
          endDate: serverFilterInput.endDate,
        }
      : undefined,
    { enabled: isInitialized }
  );

  const velocityQuery = trpc.analysis.getVelocityMetrics.useQuery(serverFilterInput, {
    enabled: isInitialized,
  });

  const capacityQuery = trpc.analysis.getCapacityMetrics.useQuery(serverFilterInput, {
    enabled: isInitialized,
  });

  const throughputQuery = trpc.analysis.getThroughput.useQuery(
    { periodType: 'month', ...serverFilterInput },
    { enabled: isInitialized }
  );

  const cycleTimeQuery = trpc.analysis.getCycleTimeMetrics.useQuery(serverFilterInput, {
    enabled: isInitialized,
  });

  const cumulativeFlowQuery = trpc.analysis.getCumulativeFlow.useQuery(
    { periodType: 'month', ...serverFilterInput },
    { enabled: isInitialized }
  );

  const distributionsQuery = trpc.analysis.getDistributions.useQuery(serverFilterInput, {
    enabled: isInitialized,
  });

  // Filtrar issues no frontend para filtros adicionais (assignees, statuses, SP)
  const filteredIssues = useMemo(() => {
    let result = issuesQuery.data || [];

    if (filters.assignees.length > 0) {
      result = result.filter((i: any) => filters.assignees.includes(i.assignee || ''));
    }
    if (filters.statuses.length > 0) {
      result = result.filter((i: any) => filters.statuses.includes(i.status || ''));
    }
    if (filters.spMin !== undefined) {
      result = result.filter((i: any) => (Number(i.storyPoints) || 0) >= filters.spMin!);
    }
    if (filters.spMax !== undefined) {
      result = result.filter((i: any) => (Number(i.storyPoints) || 0) <= filters.spMax!);
    }

    return result;
  }, [issuesQuery.data, filters.assignees, filters.statuses, filters.spMin, filters.spMax]);

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
        issueTypesQuery.refetch(),
        projectsQuery.refetch(),
        assigneesQuery.refetch(),
        statusesQuery.refetch(),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      setError(msg);
      console.error('[AnalysisContext] Erro sync:', msg);
    } finally {
      setIsSyncing(false);
    }
  }, [analysisJql, syncMutation, syncStatusQuery, issuesQuery, velocityQuery, capacityQuery, throughputQuery, cycleTimeQuery, cumulativeFlowQuery, distributionsQuery, issueTypesQuery, projectsQuery, assigneesQuery, statusesQuery]);

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

  const setFilters = useCallback((partial: Partial<AnalysisFilters>) => {
    setFiltersState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('analysisFilters', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    localStorage.removeItem('analysisFilters');
  }, []);

  const loading = isSyncing || issuesQuery.isLoading;

  return (
    <AnalysisContext.Provider
      value={{
        analysisJql,
        setAnalysisJql,
        resetAnalysisJql,
        defaultAnalysisJql: DEFAULT_ANALYSIS_JQL,
        filters,
        setFilters,
        resetFilters,
        availableIssueTypes: issueTypesQuery.data || [],
        availableProjects: projectsQuery.data || [],
        availableAssignees: assigneesQuery.data || [],
        availableStatuses: statusesQuery.data || [],
        isSyncing,
        syncData,
        syncStatus: syncStatusQuery.data as SyncStatus | null,
        issues: issuesQuery.data || [],
        filteredIssues,
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
