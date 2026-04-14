import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useDeveloperMetrics } from '@/hooks/useDeveloperMetrics';



export default function ResponsibleView() {
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: dashboardData, loading, error, refetch } = useDeveloperMetrics();

  useEffect(() => {
    if (dashboardData && !selectedDeveloper && dashboardData.developers.length > 0) {
      setSelectedDeveloper(dashboardData.developers[0].name);
    }
  }, [dashboardData, selectedDeveloper]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados do JIRA...</p>
          {error && <p className="text-red-600 text-sm mt-2">Erro: {error}</p>}
        </div>
      </div>
    );
  }

  const selectedDevData = selectedDeveloper
    ? dashboardData.developers.find(d => d.name === selectedDeveloper)
    : null;

  // Preparar dados para gráficos
  const developerComparison = dashboardData.developers.map(dev => ({
    name: dev.name.split(' ')[0], // Apenas primeiro nome
    tarefas: dev.totalTasks,
    concluidas: dev.completedTasks,
    pontos: dev.totalStoryPoints,
  }));

  const typeDistribution = selectedDevData
    ? Object.entries(selectedDevData.tasksByType).map(([type, count]) => ({
        name: type,
        tarefas: count,
      }))
    : [];

  const statusDistribution = selectedDevData
    ? Object.entries(selectedDevData.tasksByStatus).map(([status, count]) => ({
        name: status,
        tarefas: count,
      }))
    : [];

  const sprintDistribution = selectedDevData
    ? Object.entries(selectedDevData.tasksBySprint)
        .map(([sprint, count]) => ({
          name: sprint,
          tarefas: count,
        }))
        .sort((a, b) => (b.tarefas as number) - (a.tarefas as number))
        .slice(0, 8)
    : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Visão por Responsável</h1>
            <p className="text-lg text-slate-600">Análise de distribuição de tarefas por desenvolvedor</p>
            <p className="text-sm text-slate-500 mt-2">Última atualização: {new Date(dashboardData.lastUpdated).toLocaleString('pt-BR')}</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Sincronizando...' : 'Sincronizar JIRA'}
          </Button>
        </div>

        {/* KPIs Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{dashboardData.summary.totalTasks}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Desenvolvedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{dashboardData.summary.totalDevelopers}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Taxa de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {dashboardData.summary.averageCompletionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{dashboardData.summary.totalStoryPoints}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com gráficos */}
        <Tabs defaultValue="comparacao" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-md rounded-lg p-1">
            <TabsTrigger value="comparacao">Comparação</TabsTrigger>
            <TabsTrigger value="responsavel">Por Responsável</TabsTrigger>
            <TabsTrigger value="tipo">Por Tipo</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* Tab: Comparação entre Desenvolvedores */}
          <TabsContent value="comparacao" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Tarefas por Desenvolvedor</CardTitle>
                  <CardDescription>Total de tarefas atribuídas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={developerComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tarefas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="concluidas" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Story Points por Desenvolvedor</CardTitle>
                  <CardDescription>Tamanho estimado das tarefas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={developerComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pontos" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Produtividade por Desenvolvedor</CardTitle>
                <CardDescription>Taxa de conclusão e distribuição de tarefas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.developers.map((dev) => (
                    <div key={dev.name} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-slate-900">{dev.name}</h3>
                        <span className="text-sm font-bold text-blue-600">{dev.completionRate.toFixed(1)}% concluído</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${dev.completionRate}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-slate-600">Total</p>
                          <p className="font-bold text-lg">{dev.totalTasks}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Concluídas</p>
                          <p className="font-bold text-lg text-green-600">{dev.completedTasks}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Em Progresso</p>
                          <p className="font-bold text-lg text-yellow-600">{dev.inProgressTasks}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Pontos</p>
                          <p className="font-bold text-lg text-purple-600">{dev.totalStoryPoints}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Por Responsável */}
          <TabsContent value="responsavel" className="space-y-4">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Selecione um Desenvolvedor</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedDeveloper || ''} onValueChange={setSelectedDeveloper}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um desenvolvedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboardData.developers.map((dev) => (
                      <SelectItem key={dev.name} value={dev.name}>
                        {dev.name} ({dev.totalTasks} tarefas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedDevData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle>{selectedDevData.name}</CardTitle>
                    <CardDescription>Resumo de tarefas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-b pb-4">
                        <p className="text-slate-600 text-sm">Total de Tarefas</p>
                        <p className="text-3xl font-bold text-blue-600">{selectedDevData.totalTasks}</p>
                      </div>
                      <div className="border-b pb-4">
                        <p className="text-slate-600 text-sm">Concluídas</p>
                        <p className="text-3xl font-bold text-green-600">{selectedDevData.completedTasks}</p>
                        <p className="text-xs text-slate-500 mt-1">{selectedDevData.completionRate.toFixed(1)}% de conclusão</p>
                      </div>
                      <div className="border-b pb-4">
                        <p className="text-slate-600 text-sm">Em Progresso</p>
                        <p className="text-3xl font-bold text-yellow-600">{selectedDevData.inProgressTasks}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-sm">Story Points</p>
                        <p className="text-3xl font-bold text-purple-600">{selectedDevData.totalStoryPoints}</p>
                        <p className="text-xs text-slate-500 mt-1">Média: {selectedDevData.averageStoryPoints.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle>Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={typeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, tarefas }) => `${name}: ${tarefas}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="tarefas"
                        >
                          {typeDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tab: Por Tipo */}
          <TabsContent value="tipo" className="space-y-4">
            {selectedDevData && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Distribuição de Tarefas por Tipo - {selectedDevData.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={typeDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="tarefas" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Por Status */}
          <TabsContent value="status" className="space-y-4">
            {selectedDevData && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Distribuição de Tarefas por Status - {selectedDevData.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={statusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tarefas" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Detalhes */}
          <TabsContent value="detalhes" className="space-y-4">
            {selectedDevData && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle>Distribuição por Sprint - {selectedDevData.name}</CardTitle>
                  <CardDescription>Top 8 sprints com mais tarefas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={sprintDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tarefas" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
