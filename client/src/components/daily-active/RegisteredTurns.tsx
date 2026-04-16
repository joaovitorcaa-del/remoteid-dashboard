import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Turn {
  devName: string;
  summary: string;
  hasBlocker: boolean;
  blockerIssue?: string;
  timestamp: Date;
}

interface RegisteredTurnsProps {
  turns: Turn[];
}

export function RegisteredTurns({ turns }: RegisteredTurnsProps) {
  if (turns.length === 0) {
    return null;
  }

  return (
    <Card className="border-t-2 border-green-200">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Turnos Registrados ({turns.length})</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {turns.map((turn, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-48 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-green-900">{turn.devName}</p>
                  <p className="text-xs text-green-700">
                    {turn.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              </div>
              <p className="text-xs text-green-800 line-clamp-2 mb-2">{turn.summary}</p>
              {turn.hasBlocker && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {turn.blockerIssue || 'Bloqueio'}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
