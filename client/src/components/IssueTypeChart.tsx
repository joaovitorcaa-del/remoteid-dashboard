import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface IssueTypeChartProps {
  issues: any[];
}

const COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export function IssueTypeChart({ issues }: IssueTypeChartProps) {
  const data = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const issueTypeCounts = issues.reduce((acc: Record<string, number>, issue: any) => {
      const type = issue['Issue Type'] || 'Sem Tipo';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(issueTypeCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [issues]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} issues`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
