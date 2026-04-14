import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodType = 'week' | 'month' | 'sprint';

interface DeveloperMetrics {
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalStoryPoints: number;
  completionRate: number;
  tasksByType: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksBySprint: Record<string, number>;
}

interface ResponsibleViewData {
  developers: DeveloperMetrics[];
  summary: {
    totalTasks: number;
    totalDevelopers: number;
    averageCompletionRate: number;
    totalStoryPoints: number;
  };
  lastUpdated: string;
}

export default function ResponsibleView() {
  const [, navigate] = useLocation();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ResponsibleViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allDevelopers, setAllDevelopers] = useState<string[]>([]);

  // Construir JQL baseado nos filtros
  const buildJql = (): string => {
    let jql = 'project = REM AND created >= 2025-07-01';

    // Adicionar filtro de período
    if (periodType === 'month') {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      jql += ` AND updated >= ${start} AND updated <= ${end}`;
    } else if (periodType === 'week') {
      const start = format(startOfWeek(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfWeek(selectedMonth), 'yyyy-MM-dd');
      jql += ` AND updated >= ${start} AND updated <= ${end}`;
    }

    // Adicionar filtro de responsáveis
    if (selectedDevelopers.length > 0) {
      const assignees = selectedDevelopers.map(dev => `"${dev}"`).join(', ');
      jql += ` AND assignee IN (${assignees})`;
    }

    return jql;
  };

  // Buscar dados do Jira
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const jql = buildJql();
      console.log('JQL:', jql);

      // Aqui você pode chamar um endpoint tRPC para buscar dados
      // Por enquanto, vou usar dados mockados
      const mockData: ResponsibleViewData = {
        developers: [
          {
            name: 'João Silva',
            totalTasks: 12,
            completedTasks: 8,
            inProgressTasks: 3,
            totalStoryPoints: 34,
            completionRate: 66.7,
            tasksByType: { Bug: 2, Feature: 7, Task: 3 },
            tasksByStatus: { 'Done': 8, 'In Progress': 3, 'To Do': 1 },
            tasksBySprint: { 'Sprint 1': 5, 'Sprint 2': 7 },
          },
          {
            name: 'Maria Santos',
            totalTasks: 15,
            completedTasks: 10,
            inProgressTasks: 4,
            totalStoryPoints: 42,
            completionRate: 66.7,
            tasksByType: { Bug: 3, Feature: 9, Task: 3 },
            tasksByStatus: { 'Done': 10, 'In Progress': 4, 'To Do': 1 },
            tasksBySprint: { 'Sprint 1': 8, 'Sprint 2': 7 },
          },
          {
            name: 'Pedro Oliveira',
            totalTasks: 10,
            completedTasks: 7,
            inProgressTasks: 2,
            totalStoryPoints: 28,
            completionRate: 70,
            tasksByType: { Bug: 1, Feature: 6, Task: 3 },
            tasksByStatus: { 'Done': 7, 'In Progress': 2, 'To Do': 1 },
            tasksBySprint: { 'Sprint 1': 5, 'Sprint 2': 5 },
          },
        ],
        summary: {
          totalTasks: 37,
          totalDevelopers: 3,
          averageCompletionRate: 67.8,
          totalStoryPoints: 104,
        },
        lastUpdated: new Date().toISOString(),
      };

      setData(mockData);
      setAllDevelopers(mockData.developers.map(d => d.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodType, selectedMonth, selectedDevelopers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleDeveloper = (name: string) => {
    setSelectedDevelopers(prev =>
      prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
    );
  };

  const handlePreviousPeriod = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextPeriod = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
          {error && <p className="text-red-600 text-sm mt-2">Erro: {error}</p>}
        </div>
      </div>
    );
  }

  const filteredDevelopers = data?.developers.filter(d =>
    selectedDevelopers.length === 0 || selectedDevelopers.includes(d.name)
  ) || [];

  const developerComparison = filteredDevelopers.map(dev => ({
    name: dev.name.split(' ')[0],
    tarefas: dev.totalTasks,
    concluidas: dev.completedTasks,
    pontos: dev.totalStoryPoints,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
                <h1 className="text-3xl font-display text-foreground">Visão por Responsável</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Análise de distribuição de tarefas por desenvolvedor
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium mb-3">Tipo de Período</label>
              <div className="flex gap-2">
                {(['week', 'month', 'sprint'] as const).map(type => (
                  <Button
                    key={type}
                    variant={periodType === type ? 'default' : 'outline'}
                    onClick={() => setPeriodType(type)}
                    className="capitalize"
                  >
                    {type === 'week' ? 'Semana' : type === 'month' ? 'Mês' : 'Sprint'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Seletor de Mês */}
            <div>
              <label className="block text-sm font-medium mb-3">
                {periodType === 'week' ? 'Semana' : 'Mês'}
              </label>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handlePreviousPeriod}>
                  ← Anterior
                </Button>
                <span className="text-sm font-medium min-w-[200px] text-center">
                  {periodType === 'week'
                    ? `${format(startOfWeek(selectedMonth), 'dd/MM', { locale: ptBR })} - ${format(endOfWeek(selectedMonth), 'dd/MM', { locale: ptBR })}`
                    : format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <Button variant="outline" onClick={handleNextPeriod}>
                  Próximo →
                </Button>
              </div>
            </div>

            {/* Seleção de Responsáveis */}
            <div>
              <label className="block text-sm font-medium mb-3">Responsáveis</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allDevelopers.map(dev => (
                  <div key={dev} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDevelopers.includes(dev)}
                      onCheckedChange={() => toggleDeveloper(dev)}
                    />
                    <label className="text-sm cursor-pointer">{dev}</label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {filteredDevelopers.reduce((sum, d) => sum + d.totalTasks, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {filteredDevelopers.reduce((sum, d) => sum + d.completedTasks, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {filteredDevelopers.length > 0
                  ? (filteredDevelopers.reduce((sum, d) => sum + d.completionRate, 0) / filteredDevelopers.length).toFixed(1)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {filteredDevelopers.reduce((sum, d) => sum + d.totalStoryPoints, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <Tabs defaultValue="comparacao" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="comparacao">Comparação</TabsTrigger>
            <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* Comparação */}
          <TabsContent value="comparacao" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tarefas por Desenvolvedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={developerComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tarefas" fill="#3b82f6" />
                      <Bar dataKey="concluidas" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Story Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={developerComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pontos" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Distribuição */}
          <TabsContent value="distribuicao" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {filteredDevelopers.map((dev, idx) => (
                <Card key={dev.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{dev.name}</CardTitle>
                    <CardDescription>{dev.completionRate.toFixed(1)}% concluído</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${dev.completionRate}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-bold text-lg">{dev.totalTasks}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Concluídas</p>
                          <p className="font-bold text-lg text-green-600">{dev.completedTasks}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Detalhes */}
          <TabsContent value="detalhes" className="space-y-4">
            {filteredDevelopers.map(dev => (
              <Card key={dev.name}>
                <CardHeader>
                  <CardTitle>{dev.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{dev.totalTasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Concluídas</p>
                      <p className="text-2xl font-bold text-green-600">{dev.completedTasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Em Progresso</p>
                      <p className="text-2xl font-bold text-yellow-600">{dev.inProgressTasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Story Points</p>
                      <p className="text-2xl font-bold text-purple-600">{dev.totalStoryPoints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
