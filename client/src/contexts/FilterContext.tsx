import React, { createContext, useContext, useState } from 'react';

interface FilterContextType {
  selectedIssueType: string | null;
  setSelectedIssueType: (type: string | null) => void;
  availableIssueTypes: string[];
  setAvailableIssueTypes: (types: string[]) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [availableIssueTypes, setAvailableIssueTypes] = useState<string[]>([]);

  return (
    <FilterContext.Provider
      value={{
        selectedIssueType,
        setSelectedIssueType,
        availableIssueTypes,
        setAvailableIssueTypes,
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
