import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';

// Paleta de cores para membros do time (até 25 membros)
const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
  '#eab308', '#d946ef', '#2563eb', '#dc2626', '#059669',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#c026d3',
];

type MetricMode = 'count' | 'storyPoints';
type PeriodMode = 'month' | 'week' | 'sprint';

interface PeriodData {
  period: string;
  total: number;
  [memberName: string]: number | string;
}

const doneStatuses = ['DONE', 'Done', 'Closed'];

export default function ProductivityOverviewChart() {
  const { filteredIssues, issues, filters } = useAnalysis();
  const [metricMode, setMetricMode] = useState<MetricMode>('count');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');

  // Usar filteredIssues que já respeita todos os filtros (assignees, statuses, SP, etc.)
  const dataSource = filteredIssues.length > 0 || (
    filters.assignees.length > 0 || filters.statuses.length > 0 ||
    filters.spMin !== undefined || filters.spMax !== undefined
  ) ? filteredIssues : issues;

  // Extrair membros únicos (top 20 por volume)
  const topMembers = useMemo(() => {
    const memberCounts = new Map<string, number>();
    const completedIssues = dataSource.filter((i: any) => doneStatuses.includes(i.status || ''));

    completedIssues.forEach((issue: any) => {
      const name = issue.assignee || 'Não atribuído';
      memberCounts.set(name, (memberCounts.get(name) || 0) + 1);
    });

    return Array.from(memberCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
  }, [dataSource]);

  // Gerar dados agrupados por período
  const chartData = useMemo(() => {
    const completedIssues = dataSource.filter((i: any) => doneStatuses.includes(i.status || ''));
    const periodMap = new Map<string, PeriodData>();

    completedIssues.forEach((issue: any) => {
      const resolvedDate = issue.resolvedAt ? new Date(issue.resolvedAt) : (issue.updatedAt ? new Date(issue.updatedAt) : null);
      if (!resolvedDate) return;

      let periodKey: string;

      if (periodMode === 'month') {
        periodKey = `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (periodMode === 'week') {
        const weekStart = new Date(resolvedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      } else {
        // Sprint
        periodKey = issue.sprintName || 'Sem Sprint';
      }

      if (!periodMap.has(periodKey)) {
        const entry: PeriodData = { period: periodKey, total: 0 };
        topMembers.forEach(m => { entry[m] = 0; });
        periodMap.set(periodKey, entry);
      }

      const entry = periodMap.get(periodKey)!;
      const memberName = issue.assignee || 'Não atribuído';
      const value = metricMode === 'storyPoints' ? (Number(issue.storyPoints) || 0) : 1;

      entry.total += value;
      if (topMembers.includes(memberName)) {
        entry[memberName] = (entry[memberName] as number) + value;
      }
    });

    const sorted = Array.from(periodMap.values());
    if (periodMode !== 'sprint') {
      sorted.sort((a, b) => a.period.localeCompare(b.period));
    }

    return sorted;
  }, [dataSource, metricMode, periodMode, topMembers]);

  // Dados de linha de tendência (total acumulado)
  const trendData = useMemo(() => {
    let cumulative = 0;
    return chartData.map(d => {
      cumulative += d.total;
      return { period: d.period, total: d.total, cumulative };
    });
  }, [chartData]);

  // Totais para resumo
  const totals = useMemo(() => {
    const completedIssues = dataSource.filter((i: any) => doneStatuses.includes(i.status || ''));
    const totalCount = completedIssues.length;
    const totalSP = completedIssues.reduce((sum: number, i: any) => sum + (Number(i.storyPoints) || 0), 0);
    const uniqueMembers = new Set(completedIssues.map((i: any) => i.assignee).filter(Boolean)).size;
    const avgPerMember = metricMode === 'storyPoints'
      ? (uniqueMembers > 0 ? Math.round(totalSP / uniqueMembers * 10) / 10 : 0)
      : (uniqueMembers > 0 ? Math.round(totalCount / uniqueMembers * 10) / 10 : 0);
    const avgPerPeriod = chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.total, 0) / chartData.length * 10) / 10
      : 0;

    return { totalCount, totalSP, uniqueMembers, avgPerMember, avgPerPeriod };
  }, [dataSource, metricMode, chartData]);

  // Formatação do label do período
  const formatPeriod = (period: string) => {
    if (periodMode === 'month') {
      const [year, month] = period.split('-');
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
    }
    if (periodMode === 'week') {
      const parts = period.split('-');
      return `${parts[2]}/${parts[1]}`;
    }
    // Sprint: truncar nome longo
    return period.length > 20 ? period.slice(0, 18) + '...' : period;
  };

  if (dataSource.length === 0) return null;

  return (
    <Card className="border-2 border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Produtividade do Time
            </CardTitle>
            <CardDescription className="mt-1">
              Evolução e colaboração individual — {metricMode === 'count' ? 'por quantidade de itens' : 'por Story Points'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Métrica */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setMetricMode('count')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  metricMode === 'count'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Quantidade
              </button>
              <button
                onClick={() => setMetricMode('storyPoints')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  metricMode === 'storyPoints'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Story Points
              </button>
            </div>

            {/* Toggle Período */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setPeriodMode('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  periodMode === 'month'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setPeriodMode('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  periodMode === 'week'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriodMode('sprint')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  periodMode === 'sprint'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sprint
              </button>
            </div>
          </div>
        </div>

        {/* KPIs resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Total Entregue</p>
            <p className="text-xl font-bold text-blue-900">
              {metricMode === 'count' ? totals.totalCount : totals.totalSP}
            </p>
            <p className="text-xs text-blue-500">{metricMode === 'count' ? 'itens' : 'SP'}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Membros Ativos</p>
            <p className="text-xl font-bold text-green-900">{totals.uniqueMembers}</p>
            <p className="text-xs text-green-500">contribuidores</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 font-medium">Média/Membro</p>
            <p className="text-xl font-bold text-purple-900">{totals.avgPerMember}</p>
            <p className="text-xs text-purple-500">{metricMode === 'count' ? 'itens' : 'SP'}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">Média/Período</p>
            <p className="text-xl font-bold text-amber-900">{totals.avgPerPeriod}</p>
            <p className="text-xs text-amber-500">{metricMode === 'count' ? 'itens' : 'SP'}/{periodMode === 'month' ? 'mês' : periodMode === 'week' ? 'sem' : 'sprint'}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-xs text-indigo-600 font-medium">Períodos</p>
            <p className="text-xl font-bold text-indigo-900">{chartData.length}</p>
            <p className="text-xs text-indigo-500">{periodMode === 'month' ? 'meses' : periodMode === 'week' ? 'semanas' : 'sprints'}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Gráfico de barras empilhadas por membro */}
        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contribuição Individual por Período
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriod}
                  angle={periodMode === 'sprint' ? -30 : 0}
                  textAnchor={periodMode === 'sprint' ? 'end' : 'middle'}
                  height={periodMode === 'sprint' ? 80 : 40}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={formatPeriod}
                  formatter={(value: any, name: string) => [
                    `${value} ${metricMode === 'count' ? 'itens' : 'SP'}`,
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  iconSize={10}
                />
                {topMembers.map((member, idx) => (
                  <Bar
                    key={member}
                    dataKey={member}
                    stackId="members"
                    fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                    name={member.length > 20 ? member.slice(0, 18) + '...' : member}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de tendência */}
        {trendData.length > 1 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tendência de Entrega
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriod}
                  fontSize={11}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={formatPeriod}
                  formatter={(value: any, name: string) => {
                    const labels: Record<string, string> = {
                      total: `Por período (${metricMode === 'count' ? 'itens' : 'SP'})`,
                      cumulative: `Acumulado (${metricMode === 'count' ? 'itens' : 'SP'})`,
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={`Por período`}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name={`Acumulado`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ranking de membros */}
        {topMembers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Ranking de Contribuição</h4>
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Membro</th>
                    <th className="text-right p-2">Itens</th>
                    <th className="text-right p-2">SP</th>
                    <th className="text-right p-2">Média/Período</th>
                    <th className="text-left p-2 w-40">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {topMembers.map((member, idx) => {
                    const memberIssues = dataSource.filter((i: any) =>
                      (i.assignee || 'Não atribuído') === member && doneStatuses.includes(i.status || '')
                    );
                    const count = memberIssues.length;
                    const sp = memberIssues.reduce((sum: number, i: any) => sum + (Number(i.storyPoints) || 0), 0);
                    const avgPerPeriod = chartData.length > 0
                      ? Math.round((metricMode === 'count' ? count : sp) / chartData.length * 10) / 10
                      : 0;
                    const maxTotal = metricMode === 'count' ? totals.totalCount : totals.totalSP;
                    const memberTotal = metricMode === 'count' ? count : sp;
                    const pct = maxTotal > 0 ? Math.round((memberTotal / maxTotal) * 100) : 0;

                    return (
                      <tr key={member} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="p-2 font-medium flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                          />
                          <span className="truncate max-w-[180px]" title={member}>{member}</span>
                        </td>
                        <td className="text-right p-2">{count}</td>
                        <td className="text-right p-2">{sp}</td>
                        <td className="text-right p-2">{avgPerPeriod}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
