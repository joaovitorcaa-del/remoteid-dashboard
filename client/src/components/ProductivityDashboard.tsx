import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
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
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('both');
  const [showTrendline, setShowTrendline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('2025-07-01');

  // Buscar dados de produtividade
  const productivityQuery = trpc.analysis.getProductivityMetrics.useQuery(
    {
      periodType,
      assignees: selectedAssignee ? [selectedAssignee] : undefined,
      issueTypes: selectedIssueTypes.length > 0 ? selectedIssueTypes : undefined,
      startDate,
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

    // Calcular linha de tendência se ativada
    if (showTrendline) {
      const n = allData.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = allData.reduce((sum: number, d: PeriodData) => sum + d.quantity, 0);
      const sumXY = allData.reduce((sum: number, d: PeriodData, i: number) => sum + i * d.quantity, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      return allData.map((d: PeriodData, i: number) => ({
        ...d,
        trend: slope * i + intercept,
      }));
    }

    return allData;
  }, [productivityQuery.data, showTrendline]);

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
      {/* Filtros - Compactos */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-semibold mb-2">Período:</label>
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

            {/* Data de Início */}
            <div>
              <label className="block text-sm font-semibold mb-2">Data de Início:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>

            {/* Dropdown de Responsável */}
            <div>
              <label className="block text-sm font-semibold mb-2">Responsável:</label>
              <Select value={selectedAssignee || 'all'} onValueChange={(value) => setSelectedAssignee(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {assigneesQuery.data?.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>
                      {assignee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Issue */}
            <div>
              <label className="block text-sm font-semibold mb-2">Tipo de Issue:</label>
              <Select value={selectedIssueTypes.length === 0 ? 'all' : selectedIssueTypes.join(',')} onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedIssueTypes([]);
                } else {
                  setSelectedIssueTypes(value.split(','));
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {issueTypesQuery.data?.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opções Adicionais */}
          <div className="flex gap-2 mt-4">
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
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuantity}</div>
              <p className="text-xs text-muted-foreground">Média: {stats.avgQuantity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStoryPoints}</div>
              <p className="text-xs text-muted-foreground">Média: {stats.avgStoryPoints}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Períodos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chartData.length}</div>
              <p className="text-xs text-muted-foreground">Períodos analisados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Viradas de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.performanceShifts.length}</div>
              <p className="text-xs text-muted-foreground">Mudanças detectadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade ao Longo do Tempo</CardTitle>
          <CardDescription>Visualização de quantidade e story points por período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {chartMetric === 'both' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="quantity" fill="#3b82f6" name="Quantidade" />
                <Bar yAxisId="right" dataKey="storyPoints" fill="#10b981" name="Story Points" />
                {showTrendline && <Line yAxisId="left" type="monotone" dataKey="trend" stroke="#f59e0b" name="Tendência" strokeDasharray="5 5" />}
              </ComposedChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={chartMetric === 'quantity' ? 'quantity' : 'storyPoints'} fill="#3b82f6" name={chartMetric === 'quantity' ? 'Quantidade' : 'Story Points'} />
                {showTrendline && <Line type="monotone" dataKey="trend" stroke="#f59e0b" name="Tendência" strokeDasharray="5 5" />}
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Viradas de Desempenho */}
      {stats && stats.performanceShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Viradas de Desempenho Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.performanceShifts.map((shift: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-md ${shift.type === 'increase' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`font-semibold ${shift.type === 'increase' ? 'text-green-700' : 'text-red-700'}`}>
                    {shift.period}: {shift.type === 'increase' ? '↑' : '↓'} {Math.abs(shift.change)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
