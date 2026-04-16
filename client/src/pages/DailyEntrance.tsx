import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/daily/DashboardHeader';
import { SprintProgress } from '@/components/daily/SprintProgress';
import { BlockersList } from '@/components/daily/BlockersList';
import { AttentionItems } from '@/components/daily/AttentionItems';
import { ActionButtons } from '@/components/daily/ActionButtons';

export default function DailyEntrance() {
  const [, navigate] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();

  // Get active JQL filter
  const { data: activeFilter } = trpc.jqlFilters.getActive.useQuery();

  // Get sprint stats
  const {
    data: sprintStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = trpc.dailyMeeting.getSprintStats.useQuery(
    { jql: activeFilter?.jql ?? '' },
    { enabled: !!activeFilter?.jql, retry: 1 }
  );

  // Create meeting mutation
  const createMeeting = trpc.dailyMeeting.createMeeting.useMutation({
    onSuccess: (data) => {
      navigate(`/daily-active/${data.meetingId}`);
    },
    onError: (err) => {
      toast.error(`Erro ao iniciar daily: ${err.message}`);
      setIsStarting(false);
    },
  });

  const handleStartDaily = async () => {
    if (!activeFilter?.jql) {
      toast.error('Nenhum filtro JQL ativo. Configure na página de Configuração.');
      return;
    }
    setIsStarting(true);
    createMeeting.mutate({
      jqlUsed: activeFilter.jql,
      totalDevs: 0,
    });
  };

  const handleRefresh = async () => {
    await refetchStats();
    setLastUpdated(new Date());
    toast.success('Dados atualizados com sucesso');
  };

  const handleHistory = () => {
    navigate('/history');
  };

  const handleViewBoard = () => {
    navigate('/');
  };

  if (!activeFilter?.jql) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          onRefresh={handleRefresh}
          onHistory={handleHistory}
          onStartDaily={handleStartDaily}
          isRefreshing={false}
          isStarting={false}
        />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">Nenhum filtro JQL configurado</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Configure um filtro JQL na página de Configuração para começar a usar o Daily Dashboard.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/configuracao')}
                className="mt-3"
              >
                Ir para Configuração
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        onRefresh={handleRefresh}
        onHistory={handleHistory}
        onStartDaily={handleStartDaily}
        isRefreshing={statsLoading}
        isStarting={isStarting}
        lastUpdated={lastUpdated}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Erro ao carregar dados</h3>
              <p className="text-sm text-red-800 mt-1">
                {statsError?.message || 'Não foi possível carregar os dados do sprint.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3 gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {statsLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : sprintStats ? (
            <>
              <SprintProgress
                total={sprintStats.total_issues}
                completed={sprintStats.completed}
                inProgress={sprintStats.in_progress}
                todo={sprintStats.todo}
              />

              <BlockersList
                blockers={sprintStats.blockers || []}
                isLoading={statsLoading}
              />

              <AttentionItems
                unassignedCount={0}
                devsWithoutUpdate={0}
                prsAwaitingReview={0}
                blockersCount={sprintStats.blockers?.length || 0}
                isLoading={statsLoading}
              />

              <ActionButtons
                onStartDaily={handleStartDaily}
                onViewBoard={handleViewBoard}
                isStarting={isStarting}
                disabled={!sprintStats}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
