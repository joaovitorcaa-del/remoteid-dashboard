import { AlertCircle, TrendingUp, CheckCircle2, Clock, Zap, Target } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { CriticalIssuesList } from '@/components/CriticalIssuesList';
import { ProgressRing } from '@/components/ProgressRing';
import { StatusChart } from '@/components/StatusChart';
import {
  dashboardMetrics,
  criticalIssues,
  statusDistribution,
  nextSteps,
} from '@/data/dashboardData';

/**
 * Design Philosophy: Modern Enterprise Analytics
 * - Hierarquia visual clara através de tipografia e escala
 * - Dados como protagonista com contexto visual mínimo
 * - Paleta monocromática com acentos de alerta (vermelho/amarelo/verde)
 * - Espaçamento generoso para respirabilidade
 */

export default function Home() {
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
            <div>
              <p className="text-xs text-muted-foreground mb-2">Status do Projeto</p>
              <StatusBadge status={dashboardMetrics.projectHealth} label="Crítico" />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Executive Summary Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Sumário Executivo</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Taxa de Conclusão"
              value={`${dashboardMetrics.completionRate}%`}
              icon={CheckCircle2}
              description="Issues concluídas do total"
              highlight
            />
            <MetricCard
              title="Progresso (24h)"
              value={dashboardMetrics.progressLast24h}
              icon={TrendingUp}
              trend="down"
              trendValue="0 novas"
              description="Issues finalizadas"
            />
            <MetricCard
              title="Gargalo QA"
              value={dashboardMetrics.qaGargaloCount}
              icon={Clock}
              trend="down"
              trendValue="25 issues"
              description="Aguardando testes"
            />
            <MetricCard
              title="Issues Estagnadas"
              value={dashboardMetrics.staleIssuesCount}
              icon={AlertCircle}
              trend="down"
              trendValue="84.8%"
              description="Sem atualização > 3 dias"
            />
          </div>

          {/* Progress Ring */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex justify-center">
              <ProgressRing
                percentage={dashboardMetrics.completionRate}
                label="Taxa de Conclusão"
              />
            </div>
            <div className="md:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-display text-foreground mb-4">Distribuição de Issues</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Total de Issues</span>
                    <span className="font-mono font-bold text-primary">
                      {dashboardMetrics.totalIssues}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Concluídas</span>
                    <span className="font-mono font-bold text-[#10B981]">
                      {dashboardMetrics.doneIssues}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Em Progresso</span>
                    <span className="font-mono font-bold text-[#F59E0B]">
                      {dashboardMetrics.totalIssues - dashboardMetrics.doneIssues}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all duration-500"
                      style={{ width: `${dashboardMetrics.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Critical Issues Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Riscos e Bloqueadores</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Bloqueador Crítico:</strong> REM-3537 impede o avanço da migração de
                certificados. Requer atenção imediata.
              </p>
            </div>
            <CriticalIssuesList issues={criticalIssues} />
          </div>
        </section>

        {/* Status Distribution Chart */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Status vs Issue Type</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <StatusChart data={statusDistribution} />
          </div>
        </section>

        {/* Next Steps Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-display text-foreground mb-6">Próximos Passos</h2>
          <div className="space-y-4">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
              >
                <div className="flex-shrink-0 pt-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <section className="border-t border-border pt-8 mt-12">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>RemoteID Executive Dashboard • Atualizado em 26 de Janeiro de 2026</p>
            <p>Dados extraídos do backlog do projeto</p>
          </div>
        </section>
      </main>
    </div>
  );
}
