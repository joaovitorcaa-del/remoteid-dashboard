import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface StatusCount {
  status: string;
  count: number;
  percentage: number;
}

interface StatusDistributionChartProps {
  issues: Array<{ status?: string }>;
  title?: string;
  chartType?: 'pie' | 'bar';
}

// Mapeamento de cores por status (alinhado com a legenda de cores do Gantt)
const statusColors: Record<string, string> = {
  'Ready': '#9CA3AF',           // Cinza
  'Dev To Do': '#9CA3AF',       // Cinza
  'Done': '#22C55E',            // Verde
  'CODE DOING': '#22C55E',      // Verde
  'Code Doing': '#22C55E',      // Verde
  'CODE REVIEW': '#22C55E',     // Verde
  'Code Review': '#22C55E',     // Verde
  'Test': '#A855F7',            // Roxo
  'Test To Do': '#A855F7',      // Roxo
  'Test Doing': '#A855F7',      // Roxo
  'Staging': '#A855F7',         // Roxo
  'Atrasado': '#EF4444',        // Vermelho
  'Vence Hoje': '#F97316',      // Laranja
  'No Prazo': '#22C55E',        // Verde
};

const getStatusColor = (status: string): string => {
  // Procura por correspondência exata primeiro
  if (statusColors[status]) {
    return statusColors[status];
  }

  // Procura por correspondência parcial
  for (const [key, color] of Object.entries(statusColors)) {
    if (status.includes(key) || key.includes(status)) {
      return color;
    }
  }

  // Padrão
  return '#6B7280';
};

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{data.status}</p>
        <p className="text-sm">Quantidade: {data.count}</p>
        <p className="text-sm">Percentual: {data.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export function StatusDistributionChart({
  issues,
  title = 'Distribuição de Issues por Status',
  chartType = 'pie',
}: StatusDistributionChartProps) {
  // Contar issues por status
  const statusCount: Record<string, number> = {};
  
  issues.forEach((issue) => {
    const status = issue.status || 'Sem Status';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  const totalIssues = issues.length;

  // Transformar em array de dados
  const data: StatusCount[] = Object.entries(statusCount)
    .map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalIssues) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">Nenhuma issue disponível para análise</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      
      {chartType === 'pie' ? (
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="status"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="#8884d8"
                radius={[8, 8, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de resumo */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-center font-semibold">Quantidade</th>
              <th className="px-4 py-2 text-center font-semibold">Percentual</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(row.status) }}
                  />
                  <span>{row.status}</span>
                </td>
                <td className="px-4 py-2 text-center font-medium">{row.count}</td>
                <td className="px-4 py-2 text-center">{row.percentage.toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-center">{totalIssues}</td>
              <td className="px-4 py-2 text-center">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
