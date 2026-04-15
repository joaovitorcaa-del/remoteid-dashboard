import React, { createContext, useContext, useState, useEffect } from 'react';

interface JqlFilter {
  id: number;
  nome: string;
  jql: string;
  descricao?: string;
}

interface FilterContextType {
  // Issue Type Filters
  selectedIssueType: string | null;
  setSelectedIssueType: (type: string | null) => void;
  availableIssueTypes: string[];
  setAvailableIssueTypes: (types: string[]) => void;
  
  // JQL Filters
  activeJqlFilter: JqlFilter | null;
  setActiveJqlFilter: (filter: JqlFilter | null) => void;
  defaultJqlFilter: JqlFilter;
  allJqlFilters: JqlFilter[];
  setAllJqlFilters: (filters: JqlFilter[]) => void;
}

// Filtro padrão: Sprint Ativa
const DEFAULT_JQL_FILTER: JqlFilter = {
  id: 0,
  nome: 'Sprint Ativa',
  jql: 'sprint in openSprints() and project = REMOTEID',
  descricao: 'Filtro padrão - Issues da Sprint Ativa',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [availableIssueTypes, setAvailableIssueTypes] = useState<string[]>([]);
  
  // JQL Filters
  const [activeJqlFilter, setActiveJqlFilterState] = useState<JqlFilter | null>(null);
  const [allJqlFilters, setAllJqlFilters] = useState<JqlFilter[]>([]);

  // Carregar filtro ativo do localStorage ao inicializar
  useEffect(() => {
    const savedFilterId = localStorage.getItem('activeJqlFilterId');
    const savedFilterJson = localStorage.getItem('activeJqlFilter');
    
    if (savedFilterJson) {
      try {
        const savedFilter = JSON.parse(savedFilterJson);
        setActiveJqlFilterState(savedFilter);
      } catch (e) {
        // Se houver erro ao parsear, usar filtro padrão
        setActiveJqlFilterState(DEFAULT_JQL_FILTER);
      }
    } else {
      // Usar filtro padrão se nenhum estiver salvo
      setActiveJqlFilterState(DEFAULT_JQL_FILTER);
    }
  }, []);

  // Salvar filtro ativo no localStorage quando mudar
  const setActiveJqlFilter = (filter: JqlFilter | null) => {
    setActiveJqlFilterState(filter);
    if (filter) {
      localStorage.setItem('activeJqlFilterId', filter.id.toString());
      localStorage.setItem('activeJqlFilter', JSON.stringify(filter));
    } else {
      localStorage.removeItem('activeJqlFilterId');
      localStorage.removeItem('activeJqlFilter');
    }
  };

  return (
    <FilterContext.Provider
      value={{
        selectedIssueType,
        setSelectedIssueType,
        availableIssueTypes,
        setAvailableIssueTypes,
        activeJqlFilter: activeJqlFilter || DEFAULT_JQL_FILTER,
        setActiveJqlFilter,
        defaultJqlFilter: DEFAULT_JQL_FILTER,
        allJqlFilters,
        setAllJqlFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter deve ser usado dentro de FilterProvider');
  }
  return context;
}

/**
 * Hook específico para acessar o filtro JQL ativo
 * Útil para componentes que só precisam do JQL
 */
export function useActiveJqlFilter() {
  const { activeJqlFilter, setActiveJqlFilter, defaultJqlFilter } = useFilter();
  return {
    jql: activeJqlFilter?.jql || defaultJqlFilter.jql,
    filter: activeJqlFilter || defaultJqlFilter,
    setFilter: setActiveJqlFilter,
  };
}
