import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, RefreshCw, Share2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Daily() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Format date for display
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch active JQL filter
  const { data: activeJqlFilter } = trpc.jqlFilters.getActive.useQuery();

  // Fetch daily data with active JQL
  const { data: dailyData, isLoading, refetch } = trpc.daily.getDailyData.useQuery(
    {
      date: dateString,
      jql: activeJqlFilter?.jql,
    },
    {
      enabled: !!activeJqlFilter?.jql,
    }
  );

  // Fetch snapshot if it exists
  const { data: snapshot } = trpc.daily.getSnapshot.useQuery({
    date: dateString,
  });

  // Declare mutations at top level (before any conditionals)
  const saveSnapshotMutation = trpc.daily.saveSnapshot.useMutation();
  const createShareLinkMutation = trpc.daily.createSharedLink.useMutation();

  // Load notes from snapshot if available
  useEffect(() => {
    if (snapshot?.notes) {
      setNotes(snapshot.notes);
    }
  }, [snapshot]);

  const handleDateChange = (days: number) => {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (error) {
      console.error('Error refreshing:', error);
      setIsRefreshing(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!dailyData) return;

    try {
      await saveSnapshotMutation.mutateAsync({
        date: dateString,
        metricsJson: dailyData.metrics,
        devsData: dailyData.developers,
        issuesCritical: dailyData.criticalIssues,
        notes,
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  };

  const handleShare = async () => {
    if (!snapshot?.id) {
      alert('Salve um snapshot primeiro para compartilhar');
      return;
    }

    try {
      const result = await createShareLinkMutation.mutateAsync({
        snapshotId: snapshot.id,
      });
      const url = `${window.location.origin}/d/${result.url}`;
      navigator.clipboard.writeText(url);
      alert(`Link copiado para clipboard! Válido por 7 dias.`);
    } catch (error) {
      console.error('Error creating share link:', error);
    }
  };

  // Show message if no JQL filter is configured
  if (!activeJqlFilter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Nenhum Filtro JQL Configurado</h2>
          <p className="text-muted-foreground mb-4">
            Configure um filtro JQL na seção de Configuração para usar o Daily Dashboard.
          </p>
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do Daily...</p>
        </div>
      </div>
    );
  }

  if (!dailyData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhum dado disponível para esta data</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const metrics = dailyData.metrics;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Daily Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhamento diário do time
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSnapshot}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Snapshot
              </Button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <p className="text-sm font-semibold capitalize">{formattedDate}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {showSaveSuccess && (
              <p className="text-sm text-green-600">✓ Snapshot salvo com sucesso</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Comparison Card: Today vs Yesterday */}
        <div className="bg-gradient-to-br from-white to-amber-50 rounded-lg p-6 mb-6 border">
          <h2 className="text-lg font-bold mb-6">Comparação: Hoje vs Ontem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Completion Rate */}
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Taxa de Conclusão</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl line-through text-gray-400">{metrics.completionRate.yesterday}%</span>
                <span className="text-sm">→</span>
                <span className={`text-3xl font-bold ${metrics.completionRate.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.completionRate.today}%
                </span>
              </div>
              <p className={`text-sm font-semibold ${metrics.completionRate.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.completionRate.delta >= 0 ? '↑' : '↓'} {Math.abs(metrics.completionRate.delta)}% {metrics.completionRate.delta >= 0 ? 'melhor' : 'pior'}
              </p>
            </div>

            {/* Changes */}
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Mudanças Registradas</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl line-through text-gray-400">{metrics.changes.yesterday}</span>
                <span className="text-sm">→</span>
                <span className={`text-3xl font-bold ${metrics.changes.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.changes.today}
                </span>
              </div>
              <p className={`text-sm font-semibold ${metrics.changes.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.changes.delta >= 0 ? '↑' : '↓'} {Math.abs(metrics.changes.delta)} mudanças
              </p>
            </div>

            {/* Overdue Issues */}
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Issues Atrasadas</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl line-through text-gray-400">{metrics.overdue.yesterday}</span>
                <span className="text-sm">→</span>
                <span className={`text-3xl font-bold ${metrics.overdue.delta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.overdue.today}
                </span>
              </div>
              <p className={`text-sm font-semibold ${metrics.overdue.delta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.overdue.delta <= 0 ? '↓' : '↑'} {Math.abs(metrics.overdue.delta)} issues
              </p>
            </div>

            {/* Blockers */}
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Bloqueadores Ativos</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl line-through text-gray-400">{metrics.blockers.yesterday}</span>
                <span className="text-sm">→</span>
                <span className={`text-3xl font-bold ${metrics.blockers.delta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.blockers.today}
                </span>
              </div>
              <p className={`text-sm font-semibold ${metrics.blockers.delta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.blockers.delta <= 0 ? '↓' : '↑'} {Math.abs(metrics.blockers.delta)} bloqueadores
              </p>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        {dailyData.criticalIssues && dailyData.criticalIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-red-900 mb-4">⚠️ Issues Críticas</h2>
            <div className="space-y-3">
              {dailyData.criticalIssues.map((issue: any) => (
                <div key={issue.key} className="flex items-start justify-between bg-white p-3 rounded border border-red-100">
                  <div>
                    <p className="font-semibold text-sm">{issue.key}: {issue.title}</p>
                    <p className="text-xs text-muted-foreground">{issue.status}</p>
                  </div>
                  {issue.daysOverdue > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      {issue.daysOverdue}d atrasado
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Developers Grid */}
        {dailyData.developers && dailyData.developers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Atividade do Time</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyData.developers.map((dev: any) => (
                <div key={dev.id} className={`p-4 rounded-lg border ${
                  dev.status === 'active' ? 'bg-green-50 border-green-200' :
                  dev.status === 'critical' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{dev.name}</p>
                      <p className="text-xs text-muted-foreground">{dev.lastActivity}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      dev.status === 'active' ? 'bg-green-200 text-green-800' :
                      dev.status === 'critical' ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {dev.status === 'active' ? '🟢 Ativo' : dev.status === 'critical' ? '🔴 Crítico' : '⚫ Inativo'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Hoje: {dev.summary.today.inProgress} em progresso, {dev.summary.today.done} concluídas</p>
                    <p className="text-xs text-muted-foreground">Ontem: {dev.summary.yesterday.inProgress} em progresso, {dev.summary.yesterday.done} concluídas</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-lg font-bold mb-4">Anotações</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione anotações sobre o dia..."
            className="w-full p-3 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
