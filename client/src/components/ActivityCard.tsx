import { Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityEntry {
  id: number;
  issueKey: string;
  fromStatus?: string;
  toStatus?: string;
  changedBy?: string;
  changedAt: Date | string;
}

interface ActivityCardProps {
  activities: ActivityEntry[];
  isLoading?: boolean;
}

export function ActivityCard({ activities, isLoading = false }: ActivityCardProps) {
  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const lower = status.toLowerCase();
    if (lower.includes('done') || lower.includes('concluído')) return 'bg-green-100 text-green-800';
    if (lower.includes('code') || lower.includes('doing')) return 'bg-blue-100 text-blue-800';
    if (lower.includes('test') || lower.includes('qa')) return 'bg-purple-100 text-purple-800';
    if (lower.includes('ready') || lower.includes('to do')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Atividade Recente (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Atividade Recente (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma atividade nas últimas 24 horas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Atividade Recente (24h)
        </CardTitle>
        <CardDescription>
          {activities.length} mudanças registradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-b-0">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{activity.issueKey}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(activity.changedAt)}
                  </span>
                </div>

                {/* Status change */}
                {activity.fromStatus && activity.toStatus && (
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getStatusColor(activity.fromStatus)} variant="outline">
                      {activity.fromStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge className={getStatusColor(activity.toStatus)}>
                      {activity.toStatus}
                    </Badge>
                  </div>
                )}

                {/* Changed by */}
                {activity.changedBy && (
                  <p className="text-xs text-muted-foreground">
                    Por: {activity.changedBy}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
