import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getSnapshotsLastDays, calculateAverageVelocity, predictCompletionDate } from '@/lib/snapshotService';
import { TrendingUp, Calendar } from 'lucide-react';

export function ProjectEvolution() {
  const snapshots = getSnapshotsLastDays(30);
  const velocity = calculateAverageVelocity(7);
  const completionDate = predictCompletionDate(
    snapshots[snapshots.length - 1]?.totalIssues || 0,
    snapshots[snapshots.length - 1]?.doneIssues || 0,
    7
  );

  // Preparar dados para o gráfico
  const chartData = snapshots.map((snapshot) => ({
    date: snapshot.date,
    'Taxa Conclusão': snapshot.completionRate,
    'Issues Concluídas': snapshot.doneIssues,
    'Em Progresso': snapshot.inProgressIssues,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Evolução do Projeto</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum snapshot disponível. Clique em "Atualizar Dados" para começar a registrar o histórico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas de Velocidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Velocidade Média (7 dias)</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {velocity.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground ml-1">issues/dia</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Data Prevista de Conclusão</p>
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {completionDate
              ? completionDate.toLocaleDateString('pt-BR')
              : 'N/A'}
          </p>
          {completionDate && (
            <p className="text-xs text-muted-foreground mt-1">
              em ~{Math.ceil((completionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Snapshots Registrados</p>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {snapshots.length}
            <span className="text-sm font-normal text-muted-foreground ml-1">registros</span>
          </p>
        </div>
      </div>

      {/* Gráfico de Taxa de Conclusão */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Taxa de Conclusão ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'Taxa (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value) => `${value}%`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Taxa Conclusão"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Issues Concluídas vs Em Progresso */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Issues Concluídas vs Em Progresso</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar dataKey="Issues Concluídas" fill="#10b981" />
            <Bar dataKey="Em Progresso" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
