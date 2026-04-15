import React, { createContext, useContext, useState, useEffect } from 'react';

interface AnalysisContextType {
  // JQL customizado para a página Análise
  analysisJql: string;
  setAnalysisJql: (jql: string) => void;
  
  // Restaurar para padrão
  resetAnalysisJql: () => void;
  
  // JQL padrão
  defaultAnalysisJql: string;
}

// JQL padrão para a página Análise
const DEFAULT_ANALYSIS_JQL = 'project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01" ORDER BY priority DESC';

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisJql, setAnalysisJqlState] = useState<string>(DEFAULT_ANALYSIS_JQL);

  // Carregar JQL customizado do localStorage ao inicializar
  useEffect(() => {
    const savedJql = localStorage.getItem('analysisCustomJql');
    
    if (savedJql) {
      setAnalysisJqlState(savedJql);
    } else {
      setAnalysisJqlState(DEFAULT_ANALYSIS_JQL);
    }
  }, []);

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
