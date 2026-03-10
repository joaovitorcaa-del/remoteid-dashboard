import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

interface BurndownPoint {
  day: string;
  ideal: number;
  actual: number;
}

interface BurndownChartProps {
  data: BurndownPoint[];
  isLoading?: boolean;
  sprintName?: string;
}

export function BurndownChartReview({ 
  data, 
  isLoading = false,
  sprintName = 'Sprint Atual'
}: BurndownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Burndown Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Burndown Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate health status
  const lastPoint = data[data.length - 1];
  const isOnTrack = lastPoint.actual <= lastPoint.ideal;
  const healthStatus = isOnTrack ? 'On Track' : 'At Risk';
  const healthColor = isOnTrack ? 'text-green-700' : 'text-red-700';

  // Calculate remaining work
  const remainingWork = lastPoint.actual;
  const idealRemaining = lastPoint.ideal;
  const daysRemaining = Math.ceil(remainingWork / ((lastPoint.ideal - remainingWork) / data.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Burndown Chart - {sprintName}
          </div>
          <span className={`text-sm font-semibold ${healthColor}`}>
            {healthStatus}
          </span>
        </CardTitle>
        <CardDescription>
          Progresso de conclusão vs linha ideal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ideal" 
                stroke="#94a3b8" 
                strokeDasharray="5 5"
                name="Linha Ideal"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3b82f6" 
                name="Progresso Real"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Trabalho Restante</p>
            <p className="text-lg font-bold">{remainingWork}</p>
            <p className="text-xs text-muted-foreground">Story Points</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ideal Restante</p>
            <p className="text-lg font-bold">{idealRemaining}</p>
            <p className="text-xs text-muted-foreground">Story Points</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Dias Restantes</p>
            <p className="text-lg font-bold">{daysRemaining}</p>
            <p className="text-xs text-muted-foreground">Estimado</p>
          </div>
        </div>

        {/* Insight */}
        <div className={`p-3 rounded border ${isOnTrack ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs ${isOnTrack ? 'text-green-700' : 'text-red-700'}`}>
            {isOnTrack 
              ? `✓ Sprint no caminho certo - ${Math.abs(remainingWork - idealRemaining)} SP à frente do ideal`
              : `⚠ Sprint atrasada - ${Math.abs(remainingWork - idealRemaining)} SP atrás do ideal. Considere replanejamento.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
