import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, TrendingUp, Users, CheckCircle2, Zap, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodType = 'week' | 'month' | 'sprint';

interface DeveloperMetrics {
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionRate: number;
  velocity: number;
  efficiency: number;
  tasksByStatus: Record<string, number>;
  tasksByType: Record<string, number>;
  tasksBySprint: Record<string, number>;
}

interface PeriodSnapshot {
  period: string;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
  developers: DeveloperMetrics[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ResponsibleView() {
  const [, navigate] = useLocation();
  const [periodType, setPeriodType] = useState<PeriodType>('sprint');
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timelineData, setTimelineData] = useState<PeriodSnapshot[]>([]);

  // Calcular datas do período
  const getDateRange = () => {
    if (periodType === 'month') {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      return { start, end };
    } else if (periodType === 'week') {
      const start = format(startOfWeek(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfWeek(selectedMonth), 'yyyy-MM-dd');
      return { start, end };
    }
    return { start: '', end: '' };
  };

  const dateRange = getDateRange();

  // Buscar dados reais do Jira
  const metricsQuery = trpc.responsible.getMetricsByPeriod.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      periodType,
    },
    { enabled: !!dateRange.start && !!dateRange.end }
  );

  // Processar dados para timeline
  useEffect(() => {
    if (metricsQuery.data?.developers) {
      const periods = new Map<string, DeveloperMetrics[]>();
      
      metricsQuery.data.developers.forEach((dev: DeveloperMetrics) => {
        const period = Object.keys(dev.tasksBySprint || {})[0] || format(selectedMonth, 'MMM yyyy', { locale: ptBR });
        if (!periods.has(period)) {
          periods.set(period, []);
        }
        periods.get(period)!.push(dev);
      });

      const timeline: PeriodSnapshot[] = Array.from(periods.entries()).map(([period, devs]) => ({
        period,
        developers: devs,
        totalTasks: devs.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalTasks, 0),
        completedTasks: devs.reduce((sum: number, d: DeveloperMetrics) => sum + d.completedTasks, 0),
        totalStoryPoints: devs.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalStoryPoints, 0),
      }));

      setTimelineData(timeline);
      if (!selectedDeveloper && metricsQuery.data.developers.length > 0) {
        setSelectedDeveloper(metricsQuery.data.developers[0].name);
      }
    }
  }, [metricsQuery.data, selectedMonth]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await metricsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePreviousPeriod = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextPeriod = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  // Dados agregados
  const aggregatedMetrics = useMemo(() => {
    if (!metricsQuery.data?.developers) return null;
    const developers = metricsQuery.data.developers;
    return {
      totalDevelopers: developers.length,
      totalTasks: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalTasks, 0),
      completedTasks: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.completedTasks, 0),
      totalStoryPoints: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalStoryPoints, 0),
      averageVelocity: developers.length > 0 ? (developers.reduce((sum: number, d: DeveloperMetrics) => sum + (d.velocity || 0), 0) / developers.length).toFixed(1) : 0,
      averageEfficiency: developers.length > 0 ? Math.round((developers.reduce((sum: number, d: DeveloperMetrics) => sum + (d.efficiency || 0), 0) / developers.length) * 100) : 0,
    };
  }, [metricsQuery.data]);

  // Dados para gráfico de timeline
  const timelineChartData = useMemo(() => {
    return timelineData.map((period: PeriodSnapshot) => ({
      period: period.period.substring(0, 10),
      total: period.totalTasks,
      concluídas: period.completedTasks,
      pontos: period.totalStoryPoints,
    }));
  }, [timelineData]);

  // Dados para comparação entre desenvolvedores
  const comparisonData = useMemo(() => {
    if (!metricsQuery.data?.developers) return [];
    return metricsQuery.data.developers.map((dev: DeveloperMetrics) => ({
      name: dev.name.split(' ')[0],
      tarefas: dev.totalTasks,
      concluídas: dev.completedTasks,
      pontos: dev.totalStoryPoints,
      eficiência: Math.round((dev.efficiency || 0) * 100),
      velocidade: (dev.velocity || 0).toFixed(1),
    }));
  }, [metricsQuery.data]);

  // Dados do desenvolvedor selecionado
  const selectedDevMetrics = useMemo(() => {
    if (!selectedDeveloper || !metricsQuery.data?.developers) return null;
    return metricsQuery.data.developers.find((d: DeveloperMetrics) => d.name === selectedDeveloper);
  }, [selectedDeveloper, metricsQuery.data]);

  const statusData = useMemo(() => {
    if (!selectedDevMetrics?.tasksByStatus) return [];
    return Object.entries(selectedDevMetrics.tasksByStatus).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [selectedDevMetrics]);

  const typeData = useMemo(() => {
    if (!selectedDevMetrics?.tasksByType) return [];
    return Object.entries(selectedDevMetrics.tasksByType).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  }, [selectedDevMetrics]);

  if (metricsQuery.isLoading && !metricsQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados de produtividade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <div>
                <h1 className="text-3xl font-bold">Visão de Produtividade</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Análise de desempenho por desenvolvedor ao longo do tempo
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Sincronizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Filtros Compactos */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Período */}
              <div>
                <label className="block text-sm font-semibold mb-2">Tipo de Período</label>
                <div className="flex gap-2">
                  {(['week', 'month', 'sprint'] as const).map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={periodType === type ? 'default' : 'outline'}
                      onClick={() => setPeriodType(type)}
                      className="capitalize text-xs"
                    >
                      {type === 'week' ? 'Semana' : type === 'month' ? 'Mês' : 'Sprint'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Navegação de Período */}
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {periodType === 'week' ? 'Semana' : 'Mês'}
                </label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePreviousPeriod}>
                    ←
                  </Button>
                  <span className="text-sm font-medium min-w-[150px] text-center">
                    {periodType === 'week'
                      ? `${format(startOfWeek(selectedMonth), 'dd/MM', { locale: ptBR })} - ${format(endOfWeek(selectedMonth), 'dd/MM', { locale: ptBR })}`
                      : format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleNextPeriod}>
                    →
                  </Button>
                </div>
              </div>

              {/* Desenvolvedor Selecionado */}
              <div>
                <label className="block text-sm font-semibold mb-2">Desenvolvedor</label>
                <div className="flex flex-wrap gap-2">
                  {metricsQuery.data?.developers.map((dev: DeveloperMetrics) => (
                    <Button
                      key={dev.name}
                      size="sm"
                      variant={selectedDeveloper === dev.name ? 'default' : 'outline'}
                      onClick={() => setSelectedDeveloper(dev.name)}
                      className="text-xs"
                    >
                      {dev.name.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        {aggregatedMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Colaboradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregatedMetrics.totalDevelopers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Taxa Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregatedMetrics.averageVelocity}</div>
                <p className="text-xs text-muted-foreground mt-1">Eficiência: {aggregatedMetrics.averageEfficiency}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Total de Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregatedMetrics.totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{aggregatedMetrics.completedTasks} concluídas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Story Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregatedMetrics.totalStoryPoints}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Abas de Visualização */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>

          {/* Timeline de Períodos */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução ao Longo do Tempo</CardTitle>
                <CardDescription>Tarefas e story points por período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" fill="#3b82f6" name="Total" />
                    <Bar yAxisId="left" dataKey="concluídas" fill="#10b981" name="Concluídas" />
                    <Line yAxisId="right" type="monotone" dataKey="pontos" stroke="#f59e0b" name="Story Points" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparação entre Desenvolvedores */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Produtividade</CardTitle>
                <CardDescription>Tarefas, pontos e eficiência por desenvolvedor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tarefas" fill="#3b82f6" name="Tarefas" />
                    <Bar dataKey="concluídas" fill="#10b981" name="Concluídas" />
                    <Bar dataKey="pontos" fill="#f59e0b" name="Story Points" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribuição por Status */}
          <TabsContent value="status" className="space-y-4">
            {selectedDevMetrics ? (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição - {selectedDevMetrics.name}</CardTitle>
                  <CardDescription>Tarefas agrupadas por status e tipo</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-4">Por Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-4">Por Tipo</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Selecione um desenvolvedor para ver detalhes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tabela de Detalhes */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes por Desenvolvedor</CardTitle>
                <CardDescription>Métricas completas de cada colaborador</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Desenvolvedor</th>
                        <th className="text-center py-2 px-4">Total</th>
                        <th className="text-center py-2 px-4">Concluídas</th>
                        <th className="text-center py-2 px-4">Em Progresso</th>
                        <th className="text-center py-2 px-4">Story Points</th>
                        <th className="text-center py-2 px-4">Velocidade</th>
                        <th className="text-center py-2 px-4">Eficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricsQuery.data?.developers.map((dev: DeveloperMetrics) => (
                        <tr key={dev.name} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-medium">{dev.name}</td>
                          <td className="text-center py-2 px-4">{dev.totalTasks}</td>
                          <td className="text-center py-2 px-4 text-green-600">{dev.completedTasks}</td>
                          <td className="text-center py-2 px-4 text-blue-600">{dev.inProgressTasks}</td>
                          <td className="text-center py-2 px-4">{dev.totalStoryPoints}</td>
                          <td className="text-center py-2 px-4">{dev.velocity.toFixed(1)}</td>
                          <td className="text-center py-2 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${dev.efficiency > 0.7 ? 'bg-green-100 text-green-800' : dev.efficiency > 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {Math.round(dev.efficiency * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
