import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface AnalysisContextType {
  // JQL customizado para a página Análise
  analysisJql: string;
  setAnalysisJql: (jql: string) => void;
  
  // Restaurar para padrão
  resetAnalysisJql: () => void;
  
  // JQL padrão
  defaultAnalysisJql: string;

  // Dados carregados
  metricsData: any;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refreshData: () => Promise<void>;
}

// JQL padrão para a página Análise
const DEFAULT_ANALYSIS_JQL = 'project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01" ORDER BY priority DESC';

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisJql, setAnalysisJqlState] = useState<string>(DEFAULT_ANALYSIS_JQL);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar JQL customizado do localStorage ao inicializar
  useEffect(() => {
    const savedJql = localStorage.getItem('analysisCustomJql');
    
    if (savedJql) {
      setAnalysisJqlState(savedJql);
    } else {
      setAnalysisJqlState(DEFAULT_ANALYSIS_JQL);
    }
    setIsInitialized(true);
  }, []);

  // tRPC query para buscar métricas
  const metricsQuery = trpc.dashboard.getMetricsByJql.useQuery(
    { jql: analysisJql || '' },
    { enabled: !!analysisJql && isInitialized }
  );

  // Atualizar estado quando query retorna dados
  useEffect(() => {
    if (metricsQuery.data?.metrics) {
      setMetricsData({
        metrics: metricsQuery.data.metrics,
        issues: metricsQuery.data.issues || [],
      });
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      setError(null);
    }
  }, [metricsQuery.data]);

  // Capturar estado de loading da query
  useEffect(() => {
    setLoading(metricsQuery.isLoading);
  }, [metricsQuery.isLoading]);

  // Capturar erros da query
  useEffect(() => {
    if (metricsQuery.error) {
      const errorMessage = metricsQuery.error.message || 'Erro ao buscar métricas';
      setError(errorMessage);
      console.error('Erro em AnalysisContext:', errorMessage);
    }
  }, [metricsQuery.error]);

  // Função para refetch manual
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await metricsQuery.refetch();
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar dados';
      console.error('Erro ao atualizar dados:', errorMessage);
      setError(errorMessage);
    }
  }, [metricsQuery]);

  // Salvar JQL customizado no localStorage quando mudar
  const setAnalysisJql = (jql: string) => {
    setAnalysisJqlState(jql);
    localStorage.setItem('analysisCustomJql', jql);
  };

  // Restaurar para padrão
  const resetAnalysisJql = () => {
    setAnalysisJqlState(DEFAULT_ANALYSIS_JQL);
    localStorage.removeItem('analysisCustomJql');
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysisJql,
        setAnalysisJql,
        resetAnalysisJql,
        defaultAnalysisJql: DEFAULT_ANALYSIS_JQL,
        metricsData,
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
