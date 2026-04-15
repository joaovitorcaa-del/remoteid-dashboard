import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Filter, TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react';
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
  tasksByStatus: Record<string, number>;
  tasksByType: Record<string, number>;
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
    let jql = 'project = REMOTEID AND created >= 2025-07-01';

    if (periodType === 'month') {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      jql += ` AND updated >= ${start} AND updated <= ${end}`;
    } else if (periodType === 'week') {
      const start = format(startOfWeek(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfWeek(selectedMonth), 'yyyy-MM-dd');
      jql += ` AND updated >= ${start} AND updated <= ${end}`;
    }

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
      
      // Dados mockados para demonstração (em produção, chamar endpoint tRPC)
      const mockData: ResponsibleViewData = {
        developers: [
          {
            name: 'João Silva',
            totalTasks: 12,
            completedTasks: 8,
            inProgressTasks: 3,
            totalStoryPoints: 34,
            completionRate: 66.7,
            tasksByStatus: { 'Done': 8, 'In Progress': 3, 'To Do': 1 },
            tasksByType: { 'Bug': 2, 'Feature': 7, 'Task': 3 },
          },
          {
            name: 'Maria Santos',
            totalTasks: 15,
            completedTasks: 10,
            inProgressTasks: 4,
            totalStoryPoints: 42,
            completionRate: 66.7,
            tasksByStatus: { 'Done': 10, 'In Progress': 4, 'To Do': 1 },
            tasksByType: { 'Bug': 3, 'Feature': 9, 'Task': 3 },
          },
          {
            name: 'Pedro Oliveira',
            totalTasks: 10,
            completedTasks: 7,
            inProgressTasks: 2,
            totalStoryPoints: 28,
            completionRate: 70,
            tasksByStatus: { 'Done': 7, 'In Progress': 2, 'To Do': 1 },
            tasksByType: { 'Bug': 1, 'Feature': 6, 'Task': 3 },
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

  // Dados para gráfico de comparação
  const developerComparison = filteredDevelopers.map(dev => ({
    name: dev.name.split(' ')[0],
    tarefas: dev.totalTasks,
    concluidas: dev.completedTasks,
    pontos: dev.totalStoryPoints,
    taxa: Math.round(dev.completionRate),
  }));

  // Dados para gráfico de status
  const statusData = filteredDevelopers.map(dev => ({
    name: dev.name.split(' ')[0],
    Done: dev.tasksByStatus['Done'] || 0,
    'In Progress': dev.tasksByStatus['In Progress'] || 0,
    'To Do': dev.tasksByStatus['To Do'] || 0,
  }));

  // Dados para gráfico de tipo
  const typeDistribution = filteredDevelopers.flatMap(dev =>
    Object.entries(dev.tasksByType || {}).map(([type, count]) => ({
      name: type,
      value: count,
      developer: dev.name.split(' ')[0],
    }))
  );

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
                <h1 className="text-3xl font-display text-foreground">Análise por Responsável</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Distribuição de tarefas e performance de cada colaborador
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

      <main className="container py-8">
        {/* Filtros Compactos */}
        <Card className="mb-8 bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Período */}
              <div>
                <label className="block text-sm font-semibold mb-2">Período</label>
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
                <label className="block text-sm font-semibold mb-2">
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

              {/* Responsáveis */}
              <div>
                <label className="block text-sm font-semibold mb-2">Responsáveis</label>
                <div className="flex flex-wrap gap-2">
                  {allDevelopers.map(dev => (
                    <Button
                      key={dev}
                      size="sm"
                      variant={selectedDevelopers.includes(dev) ? 'default' : 'outline'}
                      onClick={() => toggleDeveloper(dev)}
                      className="text-xs"
                    >
                      {dev.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.summary.totalDevelopers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Selecionados: {selectedDevelopers.length || 'Todos'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Taxa Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.round(data?.summary.averageCompletionRate || 0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Conclusão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total de Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.summary.totalTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Story Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.summary.totalStoryPoints || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Visualizações */}
        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="types">Por Tipo</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>

          {/* Comparação de Colaboradores */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Performance</CardTitle>
                <CardDescription>Tarefas, pontos e taxa de conclusão por colaborador</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={developerComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tarefas" fill="#3b82f6" name="Tarefas" />
                    <Bar dataKey="concluidas" fill="#10b981" name="Concluídas" />
                    <Bar dataKey="pontos" fill="#f59e0b" name="Story Points" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribuição por Status */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>Tarefas agrupadas por status (Done, In Progress, To Do)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Done" fill="#10b981" stackId="a" />
                    <Bar dataKey="In Progress" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="To Do" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribuição por Tipo */}
          <TabsContent value="types">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDevelopers.map((dev, idx) => (
                <Card key={dev.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{dev.name}</CardTitle>
                    <CardDescription>Distribuição por tipo de tarefa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(dev.tasksByType || {}).map(([type, count]) => ({
                            name: type,
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(dev.tasksByType || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Detalhes */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes de Cada Colaborador</CardTitle>
                <CardDescription>Resumo completo de métricas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Concluídas</TableHead>
                        <TableHead className="text-right">Em Progresso</TableHead>
                        <TableHead className="text-right">Taxa (%)</TableHead>
                        <TableHead className="text-right">Story Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevelopers.map(dev => (
                        <TableRow key={dev.name}>
                          <TableCell className="font-medium">{dev.name}</TableCell>
                          <TableCell className="text-right">{dev.totalTasks}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">{dev.completedTasks}</TableCell>
                          <TableCell className="text-right text-amber-600">{dev.inProgressTasks}</TableCell>
                          <TableCell className="text-right">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                              {Math.round(dev.completionRate)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{dev.totalStoryPoints}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
