import React, { createContext, useContext, useState, useCallback } from 'react';
import { DashboardMetrics, StatusDistribution, CriticalIssue } from '@/data/dashboardData';
import { fetchGoogleSheetData, processSheetData } from '@/lib/googleSheetsService';
import { saveSnapshot, cleanOldSnapshots } from '@/lib/snapshotService';
import { useFilter } from './FilterContext';

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

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar dados do Google Sheets
      const sheetData = await fetchGoogleSheetData();
      
      // Processar dados
      const processedData = processSheetData(sheetData);

      // Atualizar estado
      setMetrics({
        projectHealth: processedData.projectHealth,
        completionRate: processedData.completionRate,
        progressLast24h: 0,
        qaGargaloCount: processedData.qaGargaloCount,
        qaStatuses: processedData.qaStatuses,
        devAndCodeReviewCount: processedData.devAndCodeReviewCount,
        readyToSprintCount: processedData.readyToSprintCount,
        backlogCount: processedData.backlogCount,
        totalIssues: processedData.totalIssues,
        doneIssues: processedData.doneIssues,
        canceledIssues: processedData.canceledIssues,
        inProgressIssues: processedData.inProgressIssues,
      });

      setStatusDistribution(processedData.statusDistribution);
      setCriticalIssues(processedData.criticalIssues);
      setImpediments(processedData.impediments);
      setBacklogItems(processedData.backlogItems);
      setAllIssues(sheetData);
      
      // Extrair Issue Types únicos
      const uniqueIssueTypes = Array.from(new Set(sheetData.map(row => row['Issue Type']).filter(Boolean)));
      // Usar o contexto de filtro para atualizar tipos disponíveis
      // Será feito no componente Home
      
      // Salvar snapshot
      await saveSnapshot({
        completionRate: processedData.completionRate,
        totalIssues: processedData.totalIssues,
        doneIssues: processedData.doneIssues,
        inProgressIssues: processedData.inProgressIssues,
        qaGargaloCount: processedData.qaGargaloCount,
        impedimentsCount: processedData.impediments.length,
      });
      
      // Limpar snapshots antigos
      cleanOldSnapshots();
      
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar dados';
      setError(errorMessage);
      console.error('Erro ao atualizar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        metrics,
        statusDistribution,
        criticalIssues,
        impediments,
        backlogItems,
        allIssues,
        loading,
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
