import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { StatusDistribution } from '@/data/dashboardData';

interface StatusChartProps {
  data: StatusDistribution[];
}

const CustomLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="white"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="bold"
    >
      {value}
    </text>
  );
};

export function StatusChart({ data }: StatusChartProps) {
  const colors = {
    bugs: '#1E40AF',
    improvements: '#A8C69F',
    tests: '#D98B73',
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="status"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => value}
          />
          <Legend />
          <Bar dataKey="bugs" stackId="a" fill={colors.bugs} name="Bugs">
            <LabelList dataKey="bugs" content={CustomLabel} />
          </Bar>
          <Bar dataKey="improvements" stackId="a" fill={colors.improvements} name="Improvements">
            <LabelList dataKey="improvements" content={CustomLabel} />
          </Bar>
          <Bar dataKey="tests" stackId="a" fill={colors.tests} name="Tests">
            <LabelList dataKey="tests" content={CustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
