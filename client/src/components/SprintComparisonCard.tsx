import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SprintMetrics {
  name: string;
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
}

interface SprintComparisonCardProps {
  currentSprint: SprintMetrics;
  previousSprint?: SprintMetrics;
  isLoading?: boolean;
}

export function SprintComparisonCard({ 
  currentSprint, 
  previousSprint, 
  isLoading = false 
}: SprintComparisonCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Comparação de Sprints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const currentCompletionRate = Math.round(
    (currentSprint.completed / currentSprint.total) * 100
  );

  const previousCompletionRate = previousSprint
    ? Math.round((previousSprint.completed / previousSprint.total) * 100)
    : 0;

  const completionTrend = previousSprint
    ? currentCompletionRate - previousCompletionRate
    : 0;

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-700';
    if (rate >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  const renderSprintMetrics = (sprint: SprintMetrics, isPrevious: boolean = false) => {
    const completionRate = Math.round((sprint.completed / sprint.total) * 100);
    
    return (
      <div key={sprint.name} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{sprint.name}</p>
            <p className="text-xs text-muted-foreground">
              {sprint.completed} de {sprint.total} concluídas
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getCompletionColor(completionRate)}`}>
              {completionRate}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-green-50 rounded">
            <p className="text-muted-foreground">Concluídas</p>
            <p className="font-bold text-green-700">{sprint.completed}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded">
            <p className="text-muted-foreground">Em Progresso</p>
            <p className="font-bold text-blue-700">{sprint.inProgress}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-muted-foreground">Não Iniciada</p>
            <p className="font-bold text-gray-700">{sprint.notStarted}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Comparação de Sprints
          </div>
          {completionTrend !== 0 && (
            <Badge variant={completionTrend > 0 ? 'default' : 'secondary'}>
              {completionTrend > 0 ? '+' : ''}{completionTrend}%
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Progresso da sprint atual vs anterior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Sprint */}
          {renderSprintMetrics(currentSprint)}

          {/* Previous Sprint */}
          {previousSprint && (
            <>
              <div className="border-t pt-4" />
              {renderSprintMetrics(previousSprint, true)}
            </>
          )}

          {/* Insights */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              {currentCompletionRate > previousCompletionRate
                ? `✓ Sprint atual está ${completionTrend}% à frente da anterior`
                : currentCompletionRate < previousCompletionRate
                ? `⚠ Sprint atual está ${Math.abs(completionTrend)}% atrás da anterior`
                : '→ Sprint atual no mesmo ritmo da anterior'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
