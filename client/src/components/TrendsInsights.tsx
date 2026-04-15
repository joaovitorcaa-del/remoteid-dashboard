import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Bar, BarChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Target, Lightbulb, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';

export default function TrendsInsights() {
  const { issues, velocityData, throughputData, cycleTimeData } = useAnalysis();

  // Tendência de velocity ao longo do tempo
  const velocityTrend = useMemo(() => {
    if (!velocityData?.sprints || velocityData.sprints.length < 2) return null;

    const sprints = velocityData.sprints;
    const n = sprints.length;

    // Regressão linear simples
    const sumX = (n * (n - 1)) / 2;
    const sumY = sprints.reduce((sum: number, s: any) => sum + s.completedStoryPoints, 0);
    const sumXY = sprints.reduce((sum: number, s: any, i: number) => sum + i * s.completedStoryPoints, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trend = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable';
    const avgVelocity = sumY / n;

    // Previsão para próximos 3 sprints
    const predictions = Array.from({ length: 3 }, (_, i) => ({
      name: `Sprint +${i + 1}`,
      predicted: Math.round(intercept + slope * (n + i)),
    }));

    return {
      trend,
      slope: Math.round(slope * 10) / 10,
      avgVelocity: Math.round(avgVelocity),
      data: sprints.map((s: any, i: number) => ({
        ...s,
        trendLine: Math.round(intercept + slope * i),
      })),
      predictions,
    };
  }, [velocityData]);

  // Análise de gargalos
  const bottleneckAnalysis = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const statusGroups: Record<string, { count: number; avgAge: number; issues: any[] }> = {};

    const now = new Date().getTime();

    issues.forEach((issue: any) => {
      if (['DONE', 'Done', 'Closed', 'Cancelled', 'Canceled'].includes(issue.status)) return;

      const status = issue.status || 'Desconhecido';
      if (!statusGroups[status]) statusGroups[status] = { count: 0, avgAge: 0, issues: [] };

      const age = issue.createdAt
        ? (now - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      statusGroups[status].count += 1;
      statusGroups[status].avgAge += age;
      statusGroups[status].issues.push(issue);
    });

    return Object.entries(statusGroups)
      .map(([status, data]) => ({
        status,
        count: data.count,
        avgAge: Math.round(data.avgAge / data.count),
        severity: data.count > 10 ? 'high' : data.count > 5 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  // Previsão de entrega
  const deliveryForecast = useMemo(() => {
    if (!throughputData || throughputData.length < 2) return null;

    // Calcular taxa de resolução média
    const recentPeriods = throughputData.slice(-6);
    const avgResolved = recentPeriods.reduce((sum: number, p: any) => sum + p.resolved, 0) / recentPeriods.length;
    const avgCreated = recentPeriods.reduce((sum: number, p: any) => sum + p.created, 0) / recentPeriods.length;

    // Issues pendentes
    const pendingIssues = issues?.filter((i: any) =>
      !['DONE', 'Done', 'Closed', 'Cancelled', 'Canceled'].includes(i.status)
    ).length || 0;

    // Estimativa de períodos para concluir
    const netRate = avgResolved - avgCreated;
    const periodsToComplete = netRate > 0 ? Math.ceil(pendingIssues / netRate) : null;

    return {
      avgResolved: Math.round(avgResolved),
      avgCreated: Math.round(avgCreated),
      netRate: Math.round(netRate * 10) / 10,
      pendingIssues,
      periodsToComplete,
      isGrowing: avgCreated > avgResolved,
    };
  }, [throughputData, issues]);

  // Insights automáticos
  const insights = useMemo(() => {
    const list: { type: 'success' | 'warning' | 'info'; title: string; description: string }[] = [];

    if (velocityTrend) {
      if (velocityTrend.trend === 'up') {
        list.push({
          type: 'success',
          title: 'Velocity em crescimento',
          description: `A velocity do time está crescendo em média ${velocityTrend.slope} SP por sprint. Tendência positiva.`,
        });
      } else if (velocityTrend.trend === 'down') {
        list.push({
          type: 'warning',
          title: 'Velocity em queda',
          description: `A velocity do time está diminuindo em média ${Math.abs(velocityTrend.slope)} SP por sprint. Investigar causas.`,
        });
      }
    }

    if (deliveryForecast) {
      if (deliveryForecast.isGrowing) {
        list.push({
          type: 'warning',
          title: 'Backlog crescendo',
          description: `São criadas ${deliveryForecast.avgCreated} issues/período mas resolvidas apenas ${deliveryForecast.avgResolved}. O backlog está acumulando.`,
        });
      }
      if (deliveryForecast.periodsToComplete && deliveryForecast.periodsToComplete > 0) {
        list.push({
          type: 'info',
          title: 'Previsão de conclusão',
          description: `Com a taxa atual de ${deliveryForecast.avgResolved} issues/período, as ${deliveryForecast.pendingIssues} issues pendentes serão concluídas em ~${deliveryForecast.periodsToComplete} períodos.`,
        });
      }
    }

    if (bottleneckAnalysis.length > 0) {
      const highSeverity = bottleneckAnalysis.filter(b => b.severity === 'high');
      if (highSeverity.length > 0) {
        list.push({
          type: 'warning',
          title: 'Gargalos identificados',
          description: `${highSeverity.map(b => `"${b.status}" (${b.count} issues, idade média ${b.avgAge}d)`).join(', ')}`,
        });
      }
    }

    if (cycleTimeData && cycleTimeData.length > 0) {
      const slowest = cycleTimeData[cycleTimeData.length - 1];
      if (slowest && slowest.avgDays > 30) {
        list.push({
          type: 'warning',
          title: 'Cycle time alto',
          description: `Issues do tipo "${slowest.issueType}" levam em média ${slowest.avgDays} dias para serem resolvidas.`,
        });
      }
    }

    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'Dados insuficientes',
        description: 'Sincronize mais dados para gerar insights automáticos sobre tendências e previsões.',
      });
    }

    return list;
  }, [velocityTrend, deliveryForecast, bottleneckAnalysis, cycleTimeData]);

  const hasData = issues && issues.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <TrendingUp className="w-16 h-16 mx-auto text-gray-300" />
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Nenhum dado carregado</h3>
              <p className="text-gray-500 mt-1">Sincronize os dados na aba "Dashboard de Produtividade" primeiro.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights Automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Insights Automáticos
          </CardTitle>
          <CardDescription>Análise automatizada baseada nos dados sincronizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'success' ? 'bg-green-50 border-green-500' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  {insight.type === 'success' && <ArrowUpRight className="w-5 h-5 text-green-600 mt-0.5" />}
                  {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                  {insight.type === 'info' && <Target className="w-5 h-5 text-blue-600 mt-0.5" />}
                  <div>
                    <p className="font-semibold text-sm">{insight.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tendência de Velocity */}
      {velocityTrend && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Tendência de Velocity
                </CardTitle>
                <CardDescription>
                  Velocity média: {velocityTrend.avgVelocity} SP | Tendência: {
                    velocityTrend.trend === 'up' ? 'Crescente' :
                    velocityTrend.trend === 'down' ? 'Decrescente' : 'Estável'
                  } ({velocityTrend.slope > 0 ? '+' : ''}{velocityTrend.slope} SP/sprint)
                </CardDescription>
              </div>
              <div className={`p-2 rounded-full ${
                velocityTrend.trend === 'up' ? 'bg-green-100' :
                velocityTrend.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                {velocityTrend.trend === 'up' && <ArrowUpRight className="w-5 h-5 text-green-600" />}
                {velocityTrend.trend === 'down' && <ArrowDownRight className="w-5 h-5 text-red-600" />}
                {velocityTrend.trend === 'stable' && <Minus className="w-5 h-5 text-gray-600" />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={velocityTrend.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedStoryPoints" fill="#3b82f6" name="SP Completados" />
                <Line type="monotone" dataKey="trendLine" stroke="#ef4444" name="Linha de Tendência" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Previsão */}
            {velocityTrend.predictions.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Previsão (próximos sprints)</h4>
                <div className="flex gap-4">
                  {velocityTrend.predictions.map((p, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-xs text-gray-500">{p.name}</p>
                      <p className="text-lg font-bold text-blue-600">{p.predicted} SP</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Análise de Gargalos */}
      {bottleneckAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Análise de Gargalos
            </CardTitle>
            <CardDescription>Issues paradas por status (excluindo concluídas e canceladas)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bottleneckAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" angle={-30} textAnchor="end" height={80} fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#f59e0b" name="Issues Paradas" />
                  <Bar dataKey="avgAge" fill="#ef4444" name="Idade Média (dias)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {bottleneckAnalysis.map((b, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      b.severity === 'high' ? 'border-red-200 bg-red-50' :
                      b.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{b.status}</p>
                        <p className="text-xs text-gray-500">Idade média: {b.avgAge} dias</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{b.count}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          b.severity === 'high' ? 'bg-red-100 text-red-700' :
                          b.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {b.severity === 'high' ? 'Crítico' : b.severity === 'medium' ? 'Atenção' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previsão de Entrega */}
      {deliveryForecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Previsão de Entrega
            </CardTitle>
            <CardDescription>Baseado na taxa de resolução dos últimos 6 períodos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Criadas/período</p>
                <p className="text-2xl font-bold text-blue-600">{deliveryForecast.avgCreated}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Resolvidas/período</p>
                <p className="text-2xl font-bold text-green-600">{deliveryForecast.avgResolved}</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${deliveryForecast.isGrowing ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500">Fluxo líquido</p>
                <p className={`text-2xl font-bold ${deliveryForecast.isGrowing ? 'text-red-600' : 'text-green-600'}`}>
                  {deliveryForecast.netRate > 0 ? '+' : ''}{deliveryForecast.netRate}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Issues pendentes</p>
                <p className="text-2xl font-bold text-purple-600">{deliveryForecast.pendingIssues}</p>
              </div>
            </div>
            {deliveryForecast.periodsToComplete && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Estimativa para concluir todas as issues pendentes:
                  <span className="font-bold text-lg ml-2">{deliveryForecast.periodsToComplete} períodos</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
