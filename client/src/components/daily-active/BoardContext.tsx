import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';

interface Developer {
  name: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

interface BoardContextProps {
  sprintPercentage: number;
  blockers: Array<{ key: string; days_blocked: number }>;
  developers: Developer[];
  kanbanStats: { todo: number; doing: number; done: number };
}

export function BoardContext({
  sprintPercentage,
  blockers,
  developers,
  kanbanStats
}: BoardContextProps) {
  return (
    <div className="h-full overflow-y-auto space-y-4 p-4 bg-gray-50 border-r">
      {/* Sprint Progress Mini */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sprint: {sprintPercentage}%</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={sprintPercentage} className="h-1.5" />
        </CardContent>
      </Card>

      {/* Blockers */}
      {blockers.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Bloqueios ({blockers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockers.map((b) => (
              <div key={b.key} className="text-xs text-red-800">
                <span className="font-mono font-bold">{b.key}</span> ({b.days_blocked}d)
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fila Daily</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {developers.map((dev, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              {dev.status === 'completed' && (
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              )}
              {dev.status === 'current' && (
                <div className="w-3 h-3 rounded-full bg-blue-600" />
              )}
              {dev.status === 'pending' && (
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              )}
              <span className={dev.status === 'current' ? 'font-bold' : ''}>
                {dev.status === 'current' ? '→' : '•'} {dev.name}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mini Kanban */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Kanban
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-gray-600">{kanbanStats.todo}</div>
              <div className="text-xs text-gray-500">TODO</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">{kanbanStats.doing}</div>
              <div className="text-xs text-gray-500">DOING</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{kanbanStats.done}</div>
              <div className="text-xs text-gray-500">DONE</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
