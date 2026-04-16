import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

interface SprintProgressProps {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

export function SprintProgress({
  total,
  completed,
  inProgress,
  todo
}: SprintProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Progresso do Sprint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {percentage}% ({completed}/{total} issues concluídas)
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{todo}</div>
            <div className="text-xs text-gray-500">A Fazer</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{inProgress}</div>
            <div className="text-xs text-gray-500">Em Progresso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-gray-500">Concluídas</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
