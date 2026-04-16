import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Blocker {
  key: string;
  assignee?: string;
  days_blocked: number;
}

interface BlockersListProps {
  blockers: Blocker[];
  isLoading?: boolean;
}

export function BlockersList({ blockers, isLoading }: BlockersListProps) {
  if (isLoading) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Bloqueios Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!blockers || blockers.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Bloqueios Críticos ({blockers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {blockers.map((blocker) => (
            <div
              key={blocker.key}
              className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
            >
              <div className="flex items-center gap-3">
                <Badge variant="destructive" className="font-mono text-xs">
                  {blocker.key}
                </Badge>
                {blocker.assignee && (
                  <span className="text-sm text-red-800">{blocker.assignee}</span>
                )}
              </div>
              <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                {blocker.days_blocked} dias parado
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
