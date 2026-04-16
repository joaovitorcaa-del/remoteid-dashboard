import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw, Play, History, AlertTriangle, CheckCircle2,
  Clock, Users, TrendingUp, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DailyEntrance() {
  const [, navigate] = useLocation();
  const [isStarting, setIsStarting] = useState(false);

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
    setIsStarting(true);
    createMeeting.mutate({
      jqlUsed: activeFilter?.jql ?? '',
      totalDevs: 0,
    });
  };

  const handleRefresh = () => {
    refetchStats();
    toast.success('Dados atualizados');
  };

  const todayStr = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const capitalizedToday = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Dashboard</h1>
            <p className="text-sm text-gray-500">{capitalizedToday}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/daily-history')}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Histórico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleStartDaily}
              disabled={isStarting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Iniciar Daily
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* No JQL configured */}
        {!activeFilter && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Nenhum filtro JQL configurado</p>
                  <p className="text-sm mt-1">
                    Configure um filtro JQL na{' '}
                    <button
                      onClick={() => navigate('/settings')}
                      className="underline font-medium"
                    >
                      página de Configuração
                    </button>{' '}
                    para visualizar os dados do sprint.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sprint Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Progresso do Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : statsError ? (
              <div className="flex items-center gap-3 text-red-600 py-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Erro ao carregar dados do JIRA</p>
                  <p className="text-xs text-red-500 mt-1">{statsError.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 border-red-300"
                    onClick={() => refetchStats()}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            ) : sprintStats ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {sprintStats.completion_percentage}% concluído ({sprintStats.completed}/{sprintStats.total_issues} issues)
                    </span>
                    <span className="text-sm text-gray-500">
                      {sprintStats.total_issues} total
                    </span>
                  </div>
                  <Progress value={sprintStats.completion_percentage} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{sprintStats.completed}</p>
                    <p className="text-xs text-green-600">Concluídas</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-700">{sprintStats.in_progress}</p>
                    <p className="text-xs text-blue-600">Em Progresso</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-700">{sprintStats.todo}</p>
                    <p className="text-xs text-gray-500">A Fazer</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                Configure um filtro JQL para visualizar o progresso do sprint.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Critical Blockers */}
        {sprintStats && sprintStats.blockers && sprintStats.blockers.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Bloqueios Críticos ({sprintStats.blockers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sprintStats.blockers.map((blocker: any) => (
                  <div
                    key={blocker.key}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="font-mono text-xs">
                        {blocker.key}
                      </Badge>
                      <span className="text-sm text-red-800">{blocker.assignee}</span>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                      {blocker.days_blocked} dias parado
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attention Items */}
        {sprintStats && (
          <Card className="border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                Itens de Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sprintStats.in_progress > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-800 p-2 bg-yellow-50 rounded">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{sprintStats.in_progress} issues em progresso</span>
                  </div>
                )}
                {sprintStats.todo > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{sprintStats.todo} issues ainda não iniciadas</span>
                  </div>
                )}
                {sprintStats.blockers && sprintStats.blockers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700 p-2 bg-red-50 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{sprintStats.blockers.length} issues paradas há mais de 3 dias</span>
                  </div>
                )}
                {sprintStats.total_issues === 0 && (
                  <p className="text-sm text-gray-500">Nenhum item de atenção no momento.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          <Button
            size="lg"
            onClick={handleStartDaily}
            disabled={isStarting}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            {isStarting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Iniciar Daily
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            Ver Board Completo
          </Button>
        </div>
      </div>
    </div>
  );
}
