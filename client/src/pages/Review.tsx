import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { VelocityCard } from '@/components/VelocityCard';
import { SprintComparisonCard } from '@/components/SprintComparisonCard';
import { BurndownChartReview } from '@/components/BurndownChartReview';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Review() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - será substituído por dados reais do tRPC
  const velocityData = {
    currentSprint: 45,
    previousSprint: 38,
    average: 41,
    trend: 'up' as const,
  };

  const currentSprintMetrics = {
    name: 'Sprint 24',
    completed: 28,
    inProgress: 12,
    notStarted: 5,
    total: 45,
  };

  const previousSprintMetrics = {
    name: 'Sprint 23',
    completed: 32,
    inProgress: 4,
    notStarted: 2,
    total: 38,
  };

  const burndownData = [
    { day: 'Dia 1', ideal: 45, actual: 45 },
    { day: 'Dia 2', ideal: 40, actual: 42 },
    { day: 'Dia 3', ideal: 35, actual: 38 },
    { day: 'Dia 4', ideal: 30, actual: 35 },
    { day: 'Dia 5', ideal: 25, actual: 32 },
    { day: 'Dia 6', ideal: 20, actual: 28 },
    { day: 'Dia 7', ideal: 15, actual: 25 },
    { day: 'Dia 8', ideal: 10, actual: 20 },
    { day: 'Dia 9', ideal: 5, actual: 15 },
    { day: 'Dia 10', ideal: 0, actual: 10 },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh queries
      setTimeout(() => setIsRefreshing(false), 1000);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Review</h1>
                <p className="text-sm text-muted-foreground">
                  Análise de velocidade e progresso da sprint
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Velocity Card */}
            <VelocityCard data={velocityData} />

            {/* Sprint Comparison */}
            <SprintComparisonCard
              currentSprint={currentSprintMetrics}
              previousSprint={previousSprintMetrics}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Burndown Chart */}
            <BurndownChartReview
              data={burndownData}
              sprintName="Sprint 24"
            />
          </div>
        </div>

        {/* Review Checklist */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold mb-3">Pontos de Discussão</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Velocidade aumentou 18% - o que ajudou?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Sprint está 10 SP atrás do ideal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>5 issues não iniciadas - risco?</span>
              </li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold mb-3">Ações Recomendadas</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Manter ritmo atual de entrega</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">⚠</span>
                <span>Revisar issues não iniciadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">→</span>
                <span>Planejar próxima sprint com 45+ SP</span>
              </li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-semibold mb-3">Métricas de Qualidade</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>Bugs Encontrados</span>
                <span className="font-bold">3</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Taxa de Retrabalho</span>
                <span className="font-bold">8%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Cobertura de Testes</span>
                <span className="font-bold">82%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
