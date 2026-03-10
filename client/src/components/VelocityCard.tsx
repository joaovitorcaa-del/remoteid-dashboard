import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VelocityData {
  currentSprint: number;
  previousSprint: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
}

interface VelocityCardProps {
  data: VelocityData;
  isLoading?: boolean;
}

export function VelocityCard({ data, isLoading = false }: VelocityCardProps) {
  const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up':
        return 'text-green-700';
      case 'down':
        return 'text-red-700';
      case 'stable':
        return 'text-blue-700';
    }
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up':
        return '↑ Melhorando';
      case 'down':
        return '↓ Diminuindo';
      case 'stable':
        return '→ Estável';
    }
  };

  const getTrendBgColor = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up':
        return 'bg-green-100 text-green-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      case 'stable':
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Velocidade da Sprint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const percentChange = data.previousSprint > 0 
    ? Math.round(((data.currentSprint - data.previousSprint) / data.previousSprint) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Velocidade da Sprint
          </div>
          <Badge className={getTrendBgColor(data.trend)}>
            {getTrendBadge(data.trend)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Story Points completados por sprint
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Sprint */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Sprint Atual</p>
              <p className="text-3xl font-bold text-primary">{data.currentSprint}</p>
              <p className="text-xs text-muted-foreground mt-1">Story Points</p>
            </div>
            {data.previousSprint > 0 && (
              <div className="text-right">
                <p className={`text-lg font-semibold ${getTrendColor(data.trend)}`}>
                  {percentChange > 0 ? '+' : ''}{percentChange}%
                </p>
                <p className="text-xs text-muted-foreground">vs Sprint Anterior</p>
              </div>
            )}
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sprint Anterior</p>
              <p className="text-2xl font-bold">{data.previousSprint}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Média (últimas 5)</p>
              <p className="text-2xl font-bold">{data.average}</p>
            </div>
          </div>

          {/* Insight */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              {data.trend === 'up' && `✓ Velocidade aumentou ${percentChange}% - time está acelerando!`}
              {data.trend === 'down' && `⚠ Velocidade diminuiu ${Math.abs(percentChange)}% - investigar bloqueadores`}
              {data.trend === 'stable' && `→ Velocidade estável - previsibilidade mantida`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
