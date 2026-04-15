import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';

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
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('both');
  const [showTrendline, setShowTrendline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [periodRange, setPeriodRange] = useState({ start: 0, end: 100 });

  // Buscar dados de produtividade
  const productivityQuery = trpc.analysis.getProductivityMetrics.useQuery(
    {
      periodType,
      assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      issueTypes: selectedIssueTypes.length > 0 ? selectedIssueTypes : undefined,
    }
  );

  // Buscar lista de assignees
  const assigneesQuery = trpc.responsible.getAllAssignees.useQuery();

  // Buscar lista de issue types
  const issueTypesQuery = trpc.analysis.getIssueTypes.useQuery();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await productivityQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleAssignee = (assignee: string) => {
    setSelectedAssignees(prev =>
      prev.includes(assignee)
        ? prev.filter(a => a !== assignee)
        : [...prev, assignee]
    );
  };

  const toggleIssueType = (type: string) => {
    setSelectedIssueTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Processar dados para o gráfico
  const chartData = useMemo(() => {
    if (!productivityQuery.data?.periods) return [];

    const allData = productivityQuery.data.periods as PeriodData[];
    
    // Aplicar filtro de período arrastável
    const startIdx = Math.floor((allData.length * periodRange.start) / 100);
    const endIdx = Math.ceil((allData.length * periodRange.end) / 100);
    const filteredData = allData.slice(startIdx, endIdx);

    // Calcular linha de tendência se ativada
    if (showTrendline) {
      const n = filteredData.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = filteredData.reduce((sum: number, d: PeriodData) => sum + d.quantity, 0);
      const sumXY = filteredData.reduce((sum: number, d: PeriodData, i: number) => sum + i * d.quantity, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      return filteredData.map((d: PeriodData, i: number) => ({
        ...d,
        trend: slope * i + intercept,
      }));
    }

    return filteredData;
  }, [productivityQuery.data, periodRange, showTrendline]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const totalQuantity = chartData.reduce((sum: number, d: PeriodData) => sum + d.quantity, 0);
    const totalStoryPoints = chartData.reduce((sum: number, d: PeriodData) => sum + d.storyPoints, 0);
    const avgQuantity = totalQuantity / chartData.length;
    const avgStoryPoints = totalStoryPoints / chartData.length;

    // Detectar viradas de desempenho
    let performanceShifts = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const change = ((curr.quantity - prev.quantity) / prev.quantity) * 100;
      if (Math.abs(change) > 30) {
        performanceShifts.push({
          period: curr.period,
          change: change.toFixed(1),
          type: change > 0 ? 'increase' : 'decrease',
        });
      }
    }

    return {
      totalQuantity,
      totalStoryPoints,
      avgQuantity: avgQuantity.toFixed(1),
      avgStoryPoints: avgStoryPoints.toFixed(1),
      performanceShifts,
    };
  }, [chartData]);

  if (productivityQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período */}
          <div>
            <label className="block text-sm font-semibold mb-3">Período:</label>
            <div className="flex gap-2">
              {(['sprint', 'month', 'week'] as const).map(type => (
                <Button
                  key={type}
                  onClick={() => setPeriodType(type)}
                  variant={periodType === type ? 'default' : 'outline'}
                  size="sm"
                >
                  {type === 'sprint' ? 'Sprint' : type === 'month' ? 'Mês' : 'Semana'}
                </Button>
              ))}
            </div>
          </div>

          {/* Seletor de Responsáveis */}
          <div>
            <label className="block text-sm font-semibold mb-3">Filtrar por Responsável:</label>
            <div className="flex flex-wrap gap-2">
              {assigneesQuery.data?.map(assignee => (
                <Button
                  key={assignee}
                  onClick={() => toggleAssignee(assignee)}
                  variant={selectedAssignees.includes(assignee) ? 'default' : 'outline'}
                  size="sm"
                >
                  {assignee.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Seletor de Tipos de Issue */}
          <div>
            <label className="block text-sm font-semibold mb-3">Filtrar por Tipo de Issue:</label>
            <div className="flex flex-wrap gap-2">
              {issueTypesQuery.data?.map((type: string) => (
                <Button
                  key={type}
                  onClick={() => toggleIssueType(type)}
                  variant={selectedIssueTypes.includes(type) ? 'default' : 'outline'}
                  size="sm"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Métrica do Gráfico */}
          <div>
            <label className="block text-sm font-semibold mb-3">Visualizar:</label>
            <div className="flex gap-2">
              {(['quantity', 'storyPoints', 'both'] as const).map(metric => (
                <Button
                  key={metric}
                  onClick={() => setChartMetric(metric)}
                  variant={chartMetric === metric ? 'default' : 'outline'}
                  size="sm"
                >
                  {metric === 'quantity' ? 'Quantidade' : metric === 'storyPoints' ? 'Story Points' : 'Ambos'}
                </Button>
              ))}
            </div>
          </div>

          {/* Linha de Tendência */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowTrendline(!showTrendline)}
              variant={showTrendline ? 'default' : 'outline'}
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Linha de Tendência
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Seletor de Período Arrastável */}
          <div>
            <label className="block text-sm font-semibold mb-3">Intervalo de Período:</label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={periodRange.start}
                onChange={(e) => setPeriodRange(prev => ({
                  ...prev,
                  start: Math.min(Number(e.target.value), prev.end)
                }))}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={periodRange.end}
                onChange={(e) => setPeriodRange(prev => ({
                  ...prev,
                  end: Math.max(Number(e.target.value), prev.start)
                }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Mostrando períodos {Math.floor((chartData.length * periodRange.start) / 100)} a {Math.ceil((chartData.length * periodRange.end) / 100)} de {productivityQuery.data?.periods?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalQuantity}</div>
              <p className="text-xs text-gray-500 mt-2">Média: {stats.avgQuantity} por período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.totalStoryPoints}</div>
              <p className="text-xs text-gray-500 mt-2">Média: {stats.avgStoryPoints} por período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Períodos Analisados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{chartData.length}</div>
              <p className="text-xs text-gray-500 mt-2">Intervalo selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Viradas de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.performanceShifts.length}</div>
              <p className="text-xs text-gray-500 mt-2">Mudanças {'>'}30%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade ao Longo do Tempo</CardTitle>
          <CardDescription>
            {periodType === 'sprint' ? 'Por Sprint' : periodType === 'month' ? 'Por Mês' : 'Por Semana'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {chartMetric === 'both' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="quantity" fill="#3b82f6" name="Quantidade" />
                <Bar yAxisId="right" dataKey="storyPoints" fill="#8b5cf6" name="Story Points" />
                {showTrendline && <Line yAxisId="left" type="monotone" dataKey="trend" stroke="#ef4444" strokeDasharray="5 5" name="Tendência" />}
              </ComposedChart>
            ) : chartMetric === 'quantity' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#3b82f6" name="Quantidade" />
                {showTrendline && <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeDasharray="5 5" name="Tendência" />}
              </ComposedChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="storyPoints" fill="#8b5cf6" name="Story Points" />
                {showTrendline && <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeDasharray="5 5" name="Tendência" />}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Viradas de Desempenho */}
      {stats && stats.performanceShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Viradas de Desempenho</CardTitle>
            <CardDescription>Períodos com mudanças significativas ({'>'}30%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.performanceShifts.map((shift: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{shift.period}</span>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    shift.type === 'increase'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {shift.type === 'increase' ? '↑' : '↓'} {shift.change}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
