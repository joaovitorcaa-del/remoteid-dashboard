import { useState, useEffect, useMemo } from 'react';
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

type PeriodType = 'sprint' | 'month' | 'week';

interface DeveloperMetrics {
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  completionRate: number;
  velocity: number;
  efficiency: number;
  tasksByStatus: Record<string, number>;
  tasksByType: Record<string, number>;
  tasksByPeriod: Record<string, number>;
}

interface PeriodData {
  period: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  tasksByType: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByAssignee: Record<string, {
    total: number;
    completed: number;
    inProgress: number;
    storyPoints: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ResponsibleView() {
  const [, navigate] = useLocation();
  const [periodType, setPeriodType] = useState<PeriodType>('sprint');
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Buscar lista de desenvolvedores disponíveis
  const assigneesQuery = trpc.responsible.getAllAssignees.useQuery();

  // Buscar dados reais do Jira com filtros
  const metricsQuery = trpc.responsible.getMetricsByPeriod.useQuery(
    {
      assignees: selectedDevelopers.length > 0 ? selectedDevelopers : undefined,
      periodType,
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await metricsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleDeveloper = (dev: string) => {
    setSelectedDevelopers(prev =>
      prev.includes(dev)
        ? prev.filter(d => d !== dev)
        : [...prev, dev]
    );
  };

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsQuery.data?.developers) return null;
    const developers = metricsQuery.data.developers;
    return {
      totalDevelopers: developers.length,
      totalTasks: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalTasks, 0),
      completedTasks: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.completedTasks, 0),
      inProgressTasks: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.inProgressTasks, 0),
      totalStoryPoints: developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.totalStoryPoints, 0),
      averageCompletionRate: developers.length > 0
        ? developers.reduce((sum: number, d: DeveloperMetrics) => sum + d.completionRate, 0) / developers.length
        : 0,
    };
  }, [metricsQuery.data]);

  // Dados para gráfico "Por Usuário"
  const userDistributionData = useMemo(() => {
    if (!metricsQuery.data?.developers) return [];
    return metricsQuery.data.developers.map((dev: DeveloperMetrics) => ({
      name: dev.name.split(' ')[0],
      tarefas: dev.totalTasks,
      concluídas: dev.completedTasks,
      emProgresso: dev.inProgressTasks,
    }));
  }, [metricsQuery.data]);

  // Dados para gráfico "Por Tipo"
  const typeDistributionData = useMemo(() => {
    if (!metricsQuery.data?.developers) return [];
    const typeMap = new Map<string, number>();
    metricsQuery.data.developers.forEach((dev: DeveloperMetrics) => {
      Object.entries(dev.tasksByType).forEach(([type, count]) => {
        typeMap.set(type, (typeMap.get(type) || 0) + count);
      });
    });
    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ name: type, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [metricsQuery.data]);

  // Dados para gráfico "Por Status"
  const statusDistributionData = useMemo(() => {
    if (!metricsQuery.data?.developers) return [];
    const statusMap = new Map<string, number>();
    metricsQuery.data.developers.forEach((dev: DeveloperMetrics) => {
      Object.entries(dev.tasksByStatus).forEach(([status, count]) => {
        statusMap.set(status, (statusMap.get(status) || 0) + count);
      });
    });
    return Array.from(statusMap.entries()).map(([status, count]) => ({ name: status, value: count }));
  }, [metricsQuery.data]);

  // Dados para gráfico "Por Período"
  const periodDistributionData = useMemo(() => {
    if (!metricsQuery.data?.periods) return [];
    return metricsQuery.data.periods.map((period: PeriodData) => ({
      period: period.period.substring(0, 20),
      total: period.totalTasks,
      concluídas: period.completedTasks,
      emProgresso: period.inProgressTasks,
    }));
  }, [metricsQuery.data]);

  // Dados para tabela de detalhes
  const detailsTableData = useMemo(() => {
    if (!metricsQuery.data?.developers) return [];
    return metricsQuery.data.developers.map((dev: DeveloperMetrics) => ({
      name: dev.name,
      totalTasks: dev.totalTasks,
      completedTasks: dev.completedTasks,
      inProgressTasks: dev.inProgressTasks,
      totalStoryPoints: dev.totalStoryPoints,
      completionRate: Math.round(dev.completionRate),
      velocity: dev.velocity.toFixed(1),
      efficiency: Math.round(dev.efficiency * 100),
    }));
  }, [metricsQuery.data]);

  if (metricsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <main className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análise por Desenvolvedor</h1>
              <p className="text-gray-600 mt-2">Visão de produtividade e distribuição de tarefas</p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>

          {/* Controles de Período e Desenvolvedores */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Toggle de Período */}
              <div>
                <label className="block text-sm font-semibold mb-3">Visualizar por:</label>
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

              {/* Multi-select de Desenvolvedores */}
              <div>
                <label className="block text-sm font-semibold mb-3">Filtrar por Desenvolvedor:</label>
                <div className="flex flex-wrap gap-2">
                  {assigneesQuery.data?.map(dev => (
                    <Button
                      key={dev}
                      onClick={() => toggleDeveloper(dev)}
                      variant={selectedDevelopers.includes(dev) ? 'default' : 'outline'}
                      size="sm"
                    >
                      {dev.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{aggregatedMetrics?.totalTasks || 0}</div>
              <p className="text-xs text-gray-500 mt-2">Todas as tarefas do período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tarefas Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{aggregatedMetrics?.completedTasks || 0}</div>
              <p className="text-xs text-gray-500 mt-2">{aggregatedMetrics ? Math.round(aggregatedMetrics.averageCompletionRate) : 0}% de conclusão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Em Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{aggregatedMetrics?.inProgressTasks || 0}</div>
              <p className="text-xs text-gray-500 mt-2">Tarefas em desenvolvimento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{aggregatedMetrics?.totalStoryPoints || 0}</div>
              <p className="text-xs text-gray-500 mt-2">Total de pontos</p>
            </CardContent>
          </Card>
        </div>

        {/* Abas de Visualização */}
        <Tabs defaultValue="usuario" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="usuario">Por Usuário</TabsTrigger>
            <TabsTrigger value="tipo">Por Tipo</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="periodo">Por Período</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* Aba: Por Usuário */}
          <TabsContent value="usuario">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Usuário</CardTitle>
                <CardDescription>Total de tarefas atribuídas a cada desenvolvedor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tarefas" fill="#3b82f6" name="Total" />
                    <Bar dataKey="concluídas" fill="#10b981" name="Concluídas" />
                    <Bar dataKey="emProgresso" fill="#f59e0b" name="Em Progresso" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Por Tipo */}
          <TabsContent value="tipo">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo de Tarefa</CardTitle>
                <CardDescription>Quantidade de tarefas por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeDistributionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Por Status */}
          <TabsContent value="status">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>Total de tarefas por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status por Desenvolvedor</CardTitle>
                  <CardDescription>Comparação de status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={userDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concluídas" fill="#10b981" stackId="a" />
                      <Bar dataKey="emProgresso" fill="#f59e0b" stackId="a" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba: Por Período */}
          <TabsContent value="periodo">
            <Card>
              <CardHeader>
                <CardTitle>Evolução por Período</CardTitle>
                <CardDescription>Tarefas ao longo do tempo ({periodType === 'sprint' ? 'Sprints' : periodType === 'month' ? 'Meses' : 'Semanas'})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={periodDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" />
                    <Line type="monotone" dataKey="concluídas" stroke="#10b981" name="Concluídas" />
                    <Line type="monotone" dataKey="emProgresso" stroke="#f59e0b" name="Em Progresso" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Detalhes */}
          <TabsContent value="detalhes">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes por Desenvolvedor</CardTitle>
                <CardDescription>Métricas detalhadas de cada desenvolvedor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Desenvolvedor</th>
                        <th className="text-center py-3 px-4 font-semibold">Total</th>
                        <th className="text-center py-3 px-4 font-semibold">Concluídas</th>
                        <th className="text-center py-3 px-4 font-semibold">Em Progresso</th>
                        <th className="text-center py-3 px-4 font-semibold">Story Points</th>
                        <th className="text-center py-3 px-4 font-semibold">Taxa Conclusão</th>
                        <th className="text-center py-3 px-4 font-semibold">Eficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsTableData.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{row.name}</td>
                          <td className="text-center py-3 px-4">{row.totalTasks}</td>
                          <td className="text-center py-3 px-4 text-green-600">{row.completedTasks}</td>
                          <td className="text-center py-3 px-4 text-yellow-600">{row.inProgressTasks}</td>
                          <td className="text-center py-3 px-4">{row.totalStoryPoints}</td>
                          <td className="text-center py-3 px-4">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">{row.completionRate}%</span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`px-2 py-1 rounded ${row.efficiency > 70 ? 'bg-green-100 text-green-800' : row.efficiency > 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {row.efficiency}%
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
