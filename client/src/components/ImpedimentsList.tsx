import { AlertTriangle } from 'lucide-react';

interface Impediment {
  key: string;
  status: string;
  summary: string;
  flagged: string;
  impact: 'critical';
}

interface ImpedimentsListProps {
  impediments: Impediment[];
}

export function ImpedimentsList({ impediments }: ImpedimentsListProps) {
  if (impediments.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-lg border-2 border-red-500 bg-red-50">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-bold text-red-900">
            ⚠️ Itens Impedidos ({impediments.length})
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Estes itens estão marcados como impedimentos e requerem ação imediata
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {impediments.map((impediment) => (
          <div
            key={impediment.key}
            className="p-3 rounded-lg bg-white border border-red-200 hover:border-red-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-red-700 text-sm">
                    {impediment.key}
                  </span>
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                    {impediment.status}
                  </span>
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                    {impediment.flagged}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-snug">
                  {impediment.summary}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
