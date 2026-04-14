import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface DeveloperMetrics {
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  averageStoryPoints: number;
  completionRate: number;
  tasksByType: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksBySprint: Record<string, number>;
}

interface DashboardData {
  developers: DeveloperMetrics[];
  summary: {
    totalTasks: number;
    totalDevelopers: number;
    averageCompletionRate: number;
    totalStoryPoints: number;
  };
  lastUpdated: string;
}

export function useDeveloperMetrics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: metricsData, isLoading, error: queryError, refetch } = trpc.jira.getDeveloperMetrics.useQuery(undefined, {
    enabled: true,
  });

  useEffect(() => {
    if (metricsData) {
      setData(metricsData as DashboardData);
      setLoading(false);
      setError(null);
    }
  }, [metricsData]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
    }
  }, [queryError]);

  return {
    data,
    loading: loading || isLoading,
    error,
    refetch,
  };
}
