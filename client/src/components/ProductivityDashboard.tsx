import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Download, TrendingUp, Users, Clock, Zap, Target,
  BarChart3, Activity, Layers, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ProductivityOverviewChart from '@/components/ProductivityOverviewChart';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const STATUS_COLORS: Record<string, string> = {
  'Backlog': '#94a3b8',
  'To Do': '#64748b',
  'Em Desenvolvimento': '#3b82f6',
  'Em Revisão': '#8b5cf6',
  'Em QA': '#f59e0b',
  'Staging': '#06b6d4',
  'Concluído': '#10b981',
  'Cancelado': '#ef4444',
};

export default function ProductivityDashboard() {
  const {
    analysisJql, issues, filteredIssues, isSyncing, syncData, syncStatus,
    velocityData, capacityData, throughputData, cycleTimeData,
    cumulativeFlowData, distributions, loading, error, lastUpdated,
    filters,
  } = useAnalysis();

  // Usar filteredIssues para KPIs quando há filtros de assignee/status/SP ativos
  const hasClientFilters = filters.assignees.length > 0 || filters.statuses.length > 0 || filters.spMin !== undefined || filters.spMax !== undefined;
  const displayIssues = hasClientFilters ? filteredIssues : issues;

  const [periodType, setPeriodType] = useState<'week' | 'month'>('month');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('all');

  // KPIs calculados dos dados persistidos (respeitam filtros de assignee/status/SP)
  const kpis = useMemo(() => {
    if (!displayIssues || displayIssues.length === 0) {
      return { total: 0, storyPoints: 0, completedSP: 0, completed: 0, inProgress: 0, avgCycleTime: 0, completionRate: 0 };
    }

    const total = displayIssues.length;
    const storyPoints = displayIssues.reduce((sum: number, i: any) => sum + (Number(i.storyPoints) || 0), 0);
    const doneStatuses = ['DONE', 'Done', 'Closed'];
    const completedIssues = displayIssues.filter((i: any) => doneStatuses.includes(i.status));
    const completed = completedIssues.length;
    const completedSP = completedIssues.reduce((sum: number, i: any) => sum + (Number(i.storyPoints) || 0), 0);
    const inProgressStatuses = ['CODE DOING', 'Code Doing', 'In Progress', 'CODE REVIEW', 'Code Review', 'STAGING', 'Staging'];
    const inProgress = displayIssues.filter((i: any) => inProgressStatuses.includes(i.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Cycle time médio
    const resolvedIssues = displayIssues.filter((i: any) => i.resolvedAt && i.createdAt);
    const avgCycleTime = resolvedIssues.length > 0
      ? Math.round(resolvedIssues.reduce((sum: number, i: any) => {
          const days = (new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / resolvedIssues.length * 10) / 10
      : 0;

    return { total, storyPoints, completedSP, completed, inProgress, avgCycleTime, completionRate };
  }, [displayIssues]);

  const hasData = displayIssues && displayIssues.length > 0;

  if (!analysisJql) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Nenhum JQL configurado. Clique em "Configuração JQL" para definir uma query.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!hasData && !loading && (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Nenhum dado carregado</h3>
                <p className="text-gray-500 mt-1">Clique em "Atualizar Dados" para baixar as issues do JIRA e popular os gráficos.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !hasData && (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Total Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Story Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis.storyPoints}</p>
                <p className="text-xs text-green-600 mt-1">{kpis.completedSP} entregues</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Concluídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{kpis.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-500" /> Em Progresso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{kpis.inProgress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" /> Cycle Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{kpis.avgCycleTime}d</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-500" /> Taxa Conclusão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{kpis.completionRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Geral de Produtividade */}
          <ProductivityOverviewChart />

          {/* Velocity por Sprint */}
          {velocityData && velocityData.sprints && velocityData.sprints.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Velocity por Sprint
                    </CardTitle>
                    <CardDescription>
                      Story Points completados por sprint | Velocity média: {velocityData.avgVelocity} SP
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={velocityData.sprints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={11} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const labels: Record<string, string> = {
                          totalStoryPoints: 'SP Planejados',
                          completedStoryPoints: 'SP Completados',
                          completionRate: 'Taxa Conclusão (%)',
                        };
                        return [value, labels[name] || name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalStoryPoints" fill="#93c5fd" name="SP Planejados" />
                    <Bar dataKey="completedStoryPoints" fill="#3b82f6" name="SP Completados" />
                    <Line type="monotone" dataKey="completionRate" stroke="#f59e0b" name="Taxa Conclusão (%)" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Throughput */}
          {throughputData && throughputData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Throughput - Criadas vs Resolvidas
                </CardTitle>
                <CardDescription>Issues criadas e resolvidas por período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={throughputData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" angle={-30} textAnchor="end" height={80} fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="created" fill="#3b82f6" name="Criadas" />
                    <Bar dataKey="resolved" fill="#10b981" name="Resolvidas" />
                    <Line type="monotone" dataKey="netFlow" stroke="#ef4444" name="Fluxo Líquido" strokeWidth={2} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Cycle Time por Tipo */}
          {cycleTimeData && cycleTimeData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      Cycle Time por Tipo de Issue
                    </CardTitle>
                    <CardDescription>Tempo médio (dias) entre criação e resolução</CardDescription>
                  </div>
                  <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Selecione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {cycleTimeData.map((item: any) => (
                        <SelectItem key={item.issueType} value={item.issueType}>
                          {item.issueType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectedIssueType === 'all' ? cycleTimeData : cycleTimeData.filter((item: any) => item.issueType === selectedIssueType)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" label={{ value: 'Dias', position: 'insideBottom', offset: -5 }} />
                      <YAxis dataKey="issueType" type="category" width={120} fontSize={11} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          const labels: Record<string, string> = {
                            avgDays: 'Média',
                            medianDays: 'Mediana',
                            p85Days: 'P85',
                          };
                          return [`${value} dias`, labels[name] || name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="avgDays" fill="#f59e0b" name="Média" />
                      <Bar dataKey="medianDays" fill="#3b82f6" name="Mediana" />
                      <Bar dataKey="p85Days" fill="#ef4444" name="P85" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">Detalhamento</h4>
                    <div className="overflow-auto max-h-[280px]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Tipo</th>
                            <th className="text-right p-2">Qtd</th>
                            <th className="text-right p-2">Média</th>
                            <th className="text-right p-2">Mediana</th>
                            <th className="text-right p-2">P85</th>
                            <th className="text-right p-2">Min</th>
                            <th className="text-right p-2">Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedIssueType === 'all' ? cycleTimeData : cycleTimeData.filter((item: any) => item.issueType === selectedIssueType)).map((row: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{row.issueType}</td>
                              <td className="text-right p-2">{row.count}</td>
                              <td className="text-right p-2">{row.avgDays}d</td>
                              <td className="text-right p-2">{row.medianDays}d</td>
                              <td className="text-right p-2 text-red-600">{row.p85Days}d</td>
                              <td className="text-right p-2 text-green-600">{row.minDays}d</td>
                              <td className="text-right p-2 text-orange-600">{row.maxDays}d</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cumulative Flow Diagram */}
          {cumulativeFlowData && cumulativeFlowData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Cumulative Flow Diagram
                </CardTitle>
                <CardDescription>Distribuição acumulada de issues por status ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={cumulativeFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" angle={-30} textAnchor="end" height={80} fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.entries(STATUS_COLORS).map(([status, color]) => (
                      <Area
                        key={status}
                        type="monotone"
                        dataKey={status}
                        stackId="1"
                        fill={color}
                        stroke={color}
                        name={status}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distribuições */}
          {distributions && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Por Status */}
              {distributions.byStatus && distributions.byStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributions.byStatus}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percentage }: any) => `${name} (${percentage}%)`}
                          labelLine={false}
                          fontSize={10}
                        >
                          {distributions.byStatus.map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Por Tipo */}
              {distributions.byType && distributions.byType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributions.byType}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percentage }: any) => `${name} (${percentage}%)`}
                          labelLine={false}
                          fontSize={10}
                        >
                          {distributions.byType.map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Por Prioridade */}
              {distributions.byPriority && distributions.byPriority.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuição por Prioridade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={distributions.byPriority}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Quantidade">
                          {distributions.byPriority.map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Por Projeto */}
              {distributions.byProject && distributions.byProject.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuição por Projeto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={distributions.byProject}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Quantidade">
                          {distributions.byProject.map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Capacidade do Time */}
          {capacityData && capacityData.members && capacityData.members.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Capacidade do Time
                </CardTitle>
                <CardDescription>
                  {capacityData.summary.totalMembers} membros | {capacityData.summary.totalIssues} issues | {capacityData.summary.totalStoryPoints} SP total | Média: {capacityData.summary.avgSPPerMember} SP/membro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={capacityData.members.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completedStoryPoints" fill="#10b981" name="SP Completados" stackId="sp" />
                      <Bar dataKey="inProgressIssues" fill="#3b82f6" name="Em Progresso" stackId="progress" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">Detalhamento por Membro</h4>
                    <div className="overflow-auto max-h-[330px]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Membro</th>
                            <th className="text-right p-2">Issues</th>
                            <th className="text-right p-2">SP</th>
                            <th className="text-right p-2">Feitas</th>
                            <th className="text-right p-2">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capacityData.members.map((m: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium truncate max-w-[140px]" title={m.name}>{m.name}</td>
                              <td className="text-right p-2">{m.totalIssues}</td>
                              <td className="text-right p-2">{m.totalStoryPoints}</td>
                              <td className="text-right p-2 text-green-600">{m.completedIssues}</td>
                              <td className="text-right p-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  m.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                                  m.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {m.completionRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
