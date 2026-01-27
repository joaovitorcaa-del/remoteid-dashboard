import { AlertCircle, TrendingUp, CheckCircle2, Clock, Zap, RefreshCw, Sparkles, Target, Users, Code, TestTube, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { CriticalIssuesList } from '@/components/CriticalIssuesList';
import { ImpedimentsList } from '@/components/ImpedimentsList';
import { ProgressRing } from '@/components/ProgressRing';
import { StatusChart } from '@/components/StatusChart';
import { BurnDownChart } from '@/components/BurnDownChart';
import { IssueTypeChart } from '@/components/IssueTypeChart';
import { BacklogCard } from '@/components/BacklogCard';
import { AIInsightModal } from '@/components/AIInsightModal';
import { ProjectEvolution } from '@/components/ProjectEvolution';
import { IssueTypeFilter } from '@/components/IssueTypeFilter';
import { DevIssuesModal } from '@/components/DevIssuesModal';
import { CompletedIssuesModal } from '@/components/CompletedIssuesModal';
import { ExportPDFButton } from '@/components/ExportPDFButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getCompletedIssuesLast24h } from '@/lib/completedIssuesCalculator';
import { useDashboard } from '@/contexts/DashboardContext';
import { useFilter } from '@/contexts/FilterContext';
import { useNextSteps } from '@/hooks/useNextSteps';
import { useFilteredData } from '@/hooks/useFilteredData';

/**
 * Design Philosophy: Modern Enterprise Analytics
 * - Hierarquia visual clara através de tipografia e escala
 * - Dados como protagonista com contexto visual mínimo
 * - Paleta monocromática com acentos de alerta (vermelho/amarelo/verde)
 * - Espaçamento generoso para respirabilidade
 */

export default function Home() {
  const { metrics, statusDistribution, criticalIssues, impediments, backlogItems, loading, error, lastUpdated, refreshData, allIssues } = useDashboard();
  const { steps: dynamicSteps, generateNextSteps } = useNextSteps();
  const { setAvailableIssueTypes } = useFilter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIInsight, setShowAIInsight] = useState(false);
  const [showDevIssuesModal, setShowDevIssuesModal] = useState(false);
  const [showCompletedIssuesModal, setShowCompletedIssuesModal] = useState(false);
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [devIssues, setDevIssues] = useState<any[]>([]);
  const [completedIssues, setCompletedIssues] = useState<any[]>([]);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  
  // Aplicar filtro aos dados
  const filteredData = useFilteredData(metrics, statusDistribution, criticalIssues, allIssues || []);

  useEffect(() => {
    // Extrair tipos de issue únicos e issues de desenvolvimento
    if (allIssues && allIssues.length > 0) {
      const types = Array.from(new Set(allIssues.map((issue: any) => issue['Issue Type']).filter(Boolean)));
      setIssueTypes(types as string[]);
      setAvailableIssueTypes(types as string[]);
      
      const devStatuses = ['Dev To Do', 'CODE DOING', 'CODE REVIEW', 'Dev Doing'];
      const devIssuesList = allIssues.filter((issue: any) => devStatuses.includes(issue.Status));
      setDevIssues(devIssuesList);
      
      const completed = getCompletedIssuesLast24h(allIssues);
      setCompletedIssues(completed);
    }
  }, [allIssues, setAvailableIssueTypes]);

  useEffect(() => {
    if (metrics.totalIssues > 0) {
      generateNextSteps({
        completionRate: metrics.completionRate,
        totalIssues: metrics.totalIssues,
        doneIssues: metrics.doneIssues,
        inProgressIssues: metrics.inProgressIssues || 0,
        canceledIssues: metrics.canceledIssues || 0,
        qaGargaloCount: metrics.qaGargaloCount,
        devAndCodeReviewCount: metrics.devAndCodeReviewCount,
        backlogCount: metrics.backlogCount || 0,
        impedimentsCount: impediments.length,
        projectHealth: metrics.projectHealth,
      });
    }
  }, [metrics, impediments.length, generateNextSteps]);

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      CheckCircle2: <CheckCircle2 className="w-5 h-5" />,
      AlertCircle: <AlertCircle className="w-5 h-5" />,
      Zap: <Zap className="w-5 h-5" />,
      TrendingUp: <TrendingUp className="w-5 h-5" />,
      Clock: <Clock className="w-5 h-5" />,
      Target: <Target className="w-5 h-5" />,
      Users: <Users className="w-5 h-5" />,
      Code: <Code className="w-5 h-5" />,
      TestTube: <TestTube className="w-5 h-5" />,
      Shield: <Shield className="w-5 h-5" />,
    };
    return icons[iconName] || <CheckCircle2 className="w-5 h-5" />;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display text-foreground">RemoteID Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhamento de Riscos e Progresso do Projeto
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Status do Projeto</p>
                <StatusBadge status={metrics.projectHealth} label="Crítico" />
              </div>
              <div className="flex gap-2">
                <ExportPDFButton dashboardRef={dashboardRef} fileName="remoteid-dashboard" />
                <button
                  onClick={() => setShowAIInsight(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Insight de IA
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                  Atualizar Dados
                </button>
              </div>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Última atualização: {lastUpdated}
                </p>
              )}
              {error && (
                <p className="text-xs text-red-600">
                  Erro: {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8" ref={dashboardRef}>
        {/* Executive Summary Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display text-foreground">Sumário Executivo</h2>
            {issueTypes.length > 0 && <IssueTypeFilter issueTypes={issueTypes} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Taxa de Conclusão"
              value={`${filteredData.metrics.completionRate.toFixed(1)}%`}
              icon={CheckCircle2}
              description="Issues concluídas do total"
              highlight
            />
            <div
              onClick={() => setShowCompletedIssuesModal(true)}
              className="cursor-pointer h-full"
            >
              <MetricCard
                title="Progresso (24h)"
                value={filteredData.metrics.progressLast24h || 0}
                icon={TrendingUp}
                trend={filteredData.metrics.progressLast24hTrend === 'up' ? 'up' : 'down'}
                trendValue={`${filteredData.metrics.progressLast24h || 0} novas`}
                description="Issues concluídas"
              />
            </div>
            <div className="rounded-lg border p-6 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Etapa QA</p>
                  <p className="text-3xl font-bold font-display text-foreground mb-4">
                    {filteredData.metrics.qaGargaloCount || 0}
                  </p>
                  <div className="space-y-2">
                    {filteredData.metrics.qaStatuses?.map((status) => (
                      <p key={status} className="text-xs text-muted-foreground">
                        • <span className="font-medium">{status}</span>
                      </p>
                    )) || metrics.qaStatuses.map((status) => (
                      <p key={status} className="text-xs text-muted-foreground">
                        • <span className="font-medium">{status}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-secondary">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* New Row: Dev/Code Review Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg border p-6 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setShowDevIssuesModal(true)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Em Desenvolvimento/Code Review
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold font-display text-foreground">
                      {filteredData.metrics.devAndCodeReviewCount || 0}
                    </p>
                    <span className="text-sm font-semibold text-muted-foreground">
                      issues
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Dev To Do + CODE DOING + Dev Doing
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>

            {/* Progress Ring and Distribution */}
            <div className="md:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-display text-foreground mb-4">Distribuição de Issues</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Total de Issues</span>
                    <span className="font-mono font-bold text-primary">
                      {filteredData.metrics.totalIssues}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Concluídas</span>
                    <span className="font-mono font-bold text-[#10B981]">
                      {filteredData.metrics.doneIssues}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Em Progresso</span>
                    <span className="font-mono font-bold text-[#F59E0B]">
                      {filteredData.metrics.inProgressIssues || (filteredData.metrics.totalIssues - filteredData.metrics.doneIssues - (filteredData.metrics.canceledIssues || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Canceladas</span>
                    <span className="font-mono font-bold text-[#6B7280]">
                      {filteredData.metrics.canceledIssues || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500"
                      style={{ width: `${filteredData.metrics.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Type Chart and Burn-Down Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-display text-foreground mb-4">Distribuição por Tipo</h3>
              <IssueTypeChart issues={allIssues || []} />
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <BurnDownChart
                completionRate={metrics.completionRate}
                totalIssues={metrics.totalIssues}
                doneIssues={metrics.doneIssues}
              />
            </div>
          </div>
        </section>

        {/* Critical Issues Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Riscos e Bloqueadores</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            {impediments.length > 0 && (
              <ImpedimentsList impediments={impediments} />
            )}

            {criticalIssues.length > 0 && (
              <div>
                <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>Bloqueador(es) Crítico(s):</strong> {criticalIssues.length} issue(s) crítica(s) detectada(s). Requer atenção imediata.
                  </p>
                </div>
                <CriticalIssuesList issues={criticalIssues} />
              </div>
            )}

            {impediments.length === 0 && criticalIssues.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum impedimento ou issue crítica detectada no momento.
              </p>
            )}
          </div>
        </section>

        {/* Status Distribution Chart and Backlog */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display text-foreground">Distribuição e Backlog</h2>
            {issueTypes.length > 0 && <IssueTypeFilter issueTypes={issueTypes} />}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
              {filteredData.statusDistribution.length > 0 ? (
                <StatusChart data={filteredData.statusDistribution} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Carregando dados...
                </p>
              )}
            </div>
            <div className="lg:col-span-1">
              <BacklogCard items={backlogItems} count={filteredData.metrics.backlogCount || 0} />
            </div>
          </div>
        </section>

        {/* Next Steps Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Próximos Passos</h2>
          <div className="space-y-4">
            {dynamicSteps.length > 0 ? (
              dynamicSteps.map((step) => {
                const priorityColors = {
                  high: 'border-red-200 bg-red-50',
                  medium: 'border-yellow-200 bg-yellow-50',
                  low: 'border-green-200 bg-green-50',
                };
                const priorityBadgeColors = {
                  high: 'bg-red-100 text-red-800',
                  medium: 'bg-yellow-100 text-yellow-800',
                  low: 'bg-green-100 text-green-800',
                };
                return (
                  <div
                    key={step.id}
                    className={`flex gap-4 p-4 rounded-lg border ${priorityColors[step.priority]} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex-shrink-0 pt-1 text-foreground">
                      {getIconComponent(step.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-semibold whitespace-nowrap ${priorityBadgeColors[step.priority]}`}>
                          {step.priority === 'high' ? 'Alta' : step.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Carregando próximos passos...
              </p>
            )}
          </div>
        </section>

        {/* Project Evolution Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Evolução do Projeto</h2>
          <ProjectEvolution />
        </section>

        {/* Footer */}
        <section className="border-t border-border pt-8 mt-12">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>RemoteID Executive Dashboard • Atualizado em 26 de Janeiro de 2026</p>
            <p>Dados sincronizados com Google Sheets</p>
          </div>
        </section>
      </main>

      {/* AI Insight Modal */}
      <AIInsightModal
        isOpen={showAIInsight}
        onClose={() => setShowAIInsight(false)}
        dashboardData={{
          completionRate: metrics.completionRate,
          totalIssues: metrics.totalIssues,
          doneIssues: metrics.doneIssues,
          inProgressIssues: metrics.inProgressIssues || 0,
          canceledIssues: metrics.canceledIssues || 0,
          qaGargaloCount: metrics.qaGargaloCount,
          devAndCodeReviewCount: metrics.devAndCodeReviewCount,
          backlogCount: metrics.backlogCount || 0,
          impedimentsCount: impediments.length,
          projectHealth: metrics.projectHealth,
        }}
      />
      
      {/* Dev Issues Modal */}
      <DevIssuesModal 
        open={showDevIssuesModal} 
        onOpenChange={setShowDevIssuesModal} 
        issues={devIssues} 
      />
      
      {/* Completed Issues Modal (24h) */}
      <Dialog open={showCompletedIssuesModal} onOpenChange={setShowCompletedIssuesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issues Concluidas (Ultimas 24h)</DialogTitle>
            <DialogDescription>
              {completedIssues.length} issue{completedIssues.length !== 1 ? 's' : ''} concluida{completedIssues.length !== 1 ? 's' : ''} nas ultimas 24 horas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {completedIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma issue concluida nas ultimas 24 horas</p>
            ) : (
              completedIssues.map((issue: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{issue.key || issue.Key}</p>
                      <p className="text-sm font-semibold text-foreground flex-1">{issue.summary || issue.Summary}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tipo: {issue.issueType || issue['Issue Type']}</span>
                      <span>Responsavel: {issue.assignee || issue.Assignee || 'Nao atribuido'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
