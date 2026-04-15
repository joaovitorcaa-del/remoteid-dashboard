import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function TeamAnalysis() {
  const { issues, capacityData, velocityData } = useAnalysis();

  // Dados por membro e sprint
  const memberSprintData = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const memberMap = new Map<string, Map<string, { issues: number; sp: number; completed: number }>>();

    issues.forEach((issue: any) => {
      const member = issue.assignee || 'Não atribuído';
      const sprint = issue.sprintName || 'Sem Sprint';

      if (!memberMap.has(member)) memberMap.set(member, new Map());
      const sprintMap = memberMap.get(member)!;

      if (!sprintMap.has(sprint)) sprintMap.set(sprint, { issues: 0, sp: 0, completed: 0 });
      const data = sprintMap.get(sprint)!;
      data.issues += 1;
      data.sp += Number(issue.storyPoints) || 0;
      if (['DONE', 'Done', 'Closed'].includes(issue.status)) data.completed += 1;
    });

    return Array.from(memberMap.entries()).map(([member, sprintMap]) => ({
      member,
      sprints: Array.from(sprintMap.entries()).map(([sprint, data]) => ({
        sprint,
        ...data,
      })),
    }));
  }, [issues]);

  // Radar data por membro (top 8)
  const radarData = useMemo(() => {
    if (!capacityData?.members) return [];

    return capacityData.members
      .filter((m: any) => m.name !== 'Não atribuído')
      .slice(0, 8)
      .map((m: any) => ({
        name: m.name.split(' ')[0], // Primeiro nome
        issues: m.totalIssues,
        sp: m.totalStoryPoints,
        completed: m.completedIssues,
        rate: m.completionRate,
      }));
  }, [capacityData]);

  // Distribuição de status por membro
  const memberStatusData = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const memberMap = new Map<string, Record<string, number>>();

    issues.forEach((issue: any) => {
      const member = issue.assignee || 'Não atribuído';
      if (!memberMap.has(member)) memberMap.set(member, {});
      const statusMap = memberMap.get(member)!;
      const status = issue.status || 'Desconhecido';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    // Categorizar status
    const categorize = (status: string) => {
      if (['DONE', 'Done', 'Closed'].includes(status)) return 'Concluído';
      if (['CODE DOING', 'Code Doing', 'In Progress'].includes(status)) return 'Desenvolvimento';
      if (['CODE REVIEW', 'Code Review'].includes(status)) return 'Revisão';
      if (['TEST TO DO', 'Test to Do', 'TEST DOING', 'Test Doing', 'STAGING', 'Staging'].includes(status)) return 'QA';
      if (['Cancelled', 'Canceled'].includes(status)) return 'Cancelado';
      return 'Outros';
    };

    return Array.from(memberMap.entries())
      .map(([member, statusMap]) => {
        const categorized: Record<string, number> = {};
        Object.entries(statusMap).forEach(([status, count]) => {
          const cat = categorize(status);
          categorized[cat] = (categorized[cat] || 0) + count;
        });
        return { member, ...categorized };
      })
      .sort((a, b) => {
        const totalA = Object.values(a).filter(v => typeof v === 'number').reduce((s: number, v: any) => s + v, 0);
        const totalB = Object.values(b).filter(v => typeof v === 'number').reduce((s: number, v: any) => s + v, 0);
        return totalB - totalA;
      })
      .slice(0, 15);
  }, [issues]);

  const hasData = issues && issues.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <Users className="w-16 h-16 mx-auto text-gray-300" />
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
      {/* Distribuição de Issues por Membro e Status */}
      {memberStatusData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Distribuição por Membro e Status
            </CardTitle>
            <CardDescription>Issues por categoria de status para cada membro do time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(350, memberStatusData.length * 35)}>
              <BarChart data={memberStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="member" type="category" width={140} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Concluído" stackId="a" fill="#10b981" />
                <Bar dataKey="Desenvolvimento" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Revisão" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="QA" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Cancelado" stackId="a" fill="#ef4444" />
                <Bar dataKey="Outros" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar de Performance */}
      {radarData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Radar de Performance (Top 8)
              </CardTitle>
              <CardDescription>Comparação multidimensional dos membros</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" fontSize={11} />
                  <PolarRadiusAxis />
                  <Tooltip />
                  <Radar name="Issues" dataKey="issues" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="SP" dataKey="sp" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Concluídas" dataKey="completed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking de Produtividade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Ranking de Produtividade
              </CardTitle>
              <CardDescription>Membros ordenados por SP completados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[330px] overflow-auto">
                {capacityData?.members
                  ?.filter((m: any) => m.name !== 'Não atribuído')
                  .map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${m.completionRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{m.completedStoryPoints} SP</p>
                        <p className="text-xs text-gray-500">{m.completionRate}%</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Velocity por Sprint por Membro */}
      {memberSprintData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Detalhamento por Membro e Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Membro</th>
                    <th className="text-left p-2">Sprint</th>
                    <th className="text-right p-2">Issues</th>
                    <th className="text-right p-2">SP</th>
                    <th className="text-right p-2">Concluídas</th>
                    <th className="text-right p-2">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSprintData.flatMap((m) =>
                    m.sprints.map((s, idx) => (
                      <tr key={`${m.member}-${s.sprint}`} className="border-b hover:bg-gray-50">
                        {idx === 0 && (
                          <td className="p-2 font-medium" rowSpan={m.sprints.length}>
                            {m.member}
                          </td>
                        )}
                        <td className="p-2 text-gray-600">{s.sprint}</td>
                        <td className="text-right p-2">{s.issues}</td>
                        <td className="text-right p-2">{s.sp}</td>
                        <td className="text-right p-2 text-green-600">{s.completed}</td>
                        <td className="text-right p-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.issues > 0 && (s.completed / s.issues) >= 0.8 ? 'bg-green-100 text-green-700' :
                            s.issues > 0 && (s.completed / s.issues) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.issues > 0 ? Math.round((s.completed / s.issues) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
