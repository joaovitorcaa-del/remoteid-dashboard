import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BurnDownData {
  day: string;
  ideal: number;
  actual: number;
}

interface BurnDownChartProps {
  completionRate: number;
  totalIssues: number;
  doneIssues: number;
}

export function BurnDownChart({ completionRate, totalIssues, doneIssues }: BurnDownChartProps) {
  // Gerar dados simulados de Burn-Down baseado na taxa de conclusão
  // Em um cenário real, esses dados viriam do histórico de snapshots diários
  const generateBurnDownData = (): BurnDownData[] => {
    const days = 14; // Últimos 14 dias
    const data: BurnDownData[] = [];
    
    // Calcular a velocidade média (issues/dia)
    const velocity = doneIssues / Math.max(days, 1);
    
    for (let i = 0; i <= days; i++) {
      const dayLabel = `D${i}`;
      const idealRemaining = Math.max(0, totalIssues - (totalIssues / days) * i);
      const actualRemaining = Math.max(0, totalIssues - velocity * i);
      
      data.push({
        day: dayLabel,
        ideal: Math.round(idealRemaining),
        actual: Math.round(actualRemaining),
      });
    }
    
    return data;
  };

  const data = generateBurnDownData();

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Burn-Down (14 dias)</h3>
        <p className="text-xs text-muted-foreground">Tendência de conclusão</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
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
            formatter={(value) => `${value} issues`}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Ideal"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Atual"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Ideal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-muted-foreground">Atual</span>
        </div>
      </div>
    </div>
  );
}
