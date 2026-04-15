import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useFilter } from '@/contexts/FilterContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PeriodType = 'sprint' | 'month' | 'week';
type ChartMetric = 'quantity' | 'storyPoints' | 'both';

interface PeriodData {
  period: string;
  quantity: number;
  storyPoints: number;
  trend?: number;
  byType?: Record<string, { quantity: number; storyPoints: number }>;
}

export default function ProductivityDashboard() {
  const { activeJqlFilter } = useFilter();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('both');
  const [showTrendline, setShowTrendline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Buscar métricas usando o mesmo JQL do Dashboard
  const metricsQuery = trpc.dashboard.getMetricsByJql.useQuery(
    { jql: activeJqlFilter?.jql || '' },
    { enabled: !!activeJqlFilter?.jql }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await metricsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Processar dados para o gráfico
  const chartData = useMemo(() => {
    if (!metricsQuery.data?.issues) return [];

    const issues = metricsQuery.data.issues as any[];
    const periodMap = new Map<string, any>();

    issues.forEach((issue: any) => {
      const created = new Date(issue.fields.created);
      let periodKey: string;

      if (periodType === 'sprint') {
        const sprint = issue.fields.customfield_10020?.[0];
        periodKey = sprint?.name || 'Sem Sprint';
      } else if (periodType === 'month') {
        const month = created.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        periodKey = month;
      } else {
        const weekStart = new Date(created);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodKey = weekStart.toLocaleDateString('pt-BR');
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          quantity: 0,
          storyPoints: 0,
          byType: {},
        });
      }

      const period = periodMap.get(periodKey);
      period.quantity += 1;

      const storyPoints = issue.fields.customfield_10028 || issue.fields.customfield_10029 || 0;
      period.storyPoints += storyPoints;

      const issueType = issue.fields.issuetype?.name || 'Desconhecido';
      if (!period.byType[issueType]) {
        period.byType[issueType] = { quantity: 0, storyPoints: 0 };
      }
      period.byType[issueType].quantity += 1;
      period.byType[issueType].storyPoints += storyPoints;
    });

    const allData = Array.from(periodMap.values());

    // Calcular linha de tendência se ativada
    if (showTrendline) {
      const n = allData.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = allData.reduce((sum: number, d: any) => sum + d.quantity, 0);
      const sumXY = allData.reduce((sum: number, d: any, i: number) => sum + i * d.quantity, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      return allData.map((d: any, i: number) => ({
        ...d,
        trend: Math.round(intercept + slope * i),
      }));
    }

    return allData;
  }, [metricsQuery.data?.issues, periodType, showTrendline]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    if (!metricsQuery.data?.issues) {
      return { total: 0, storyPoints: 0, completed: 0, inProgress: 0 };
    }

    const issues = metricsQuery.data.issues as any[];
    const total = issues.length;
    const storyPoints = issues.reduce((sum: number, i: any) => sum + (i.fields.customfield_10028 || i.fields.customfield_10029 || 0), 0);
    const completed = issues.filter((i: any) => i.fields.status?.name === 'DONE').length;
    const inProgress = issues.filter((i: any) => ['CODE DOING', 'CODE REVIEW', 'STAGING'].includes(i.fields.status?.name)).length;

    return { total, storyPoints, completed, inProgress };
  }, [metricsQuery.data?.issues]);

  if (!activeJqlFilter?.jql) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Selecione um filtro JQL nas configurações para visualizar dados</p>
        </CardContent>
      </Card>
    );
  }

  if (metricsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  if (metricsQuery.error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-red-600">Erro ao carregar dados: {metricsQuery.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Story Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.storyPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{kpis.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Em Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{kpis.inProgress}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Compactos */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Período</label>
              <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Métrica</label>
              <Select value={chartMetric} onValueChange={(value: any) => setChartMetric(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="storyPoints">Story Points</SelectItem>
                  <SelectItem value="both">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrendline}
                  onChange={(e) => setShowTrendline(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Linha de Tendência</span>
              </label>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleRefresh} disabled={isRefreshing} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Produtividade</CardTitle>
          <CardDescription>Visualização por {periodType === 'sprint' ? 'Sprint' : periodType === 'month' ? 'Mês' : 'Semana'}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-gray-600 py-8">Sem dados para exibir</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                {(chartMetric === 'quantity' || chartMetric === 'both') && (
                  <Bar dataKey="quantity" fill="#3b82f6" name="Quantidade" />
                )}
                {(chartMetric === 'storyPoints' || chartMetric === 'both') && (
                  <Bar dataKey="storyPoints" fill="#10b981" name="Story Points" />
                )}
                {showTrendline && (
                  <Line type="monotone" dataKey="trend" stroke="#f59e0b" name="Tendência" strokeDasharray="5 5" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
