import { Card } from '@/components/ui/card';

interface Developer {
  name: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  turnOrder: number;
}

interface DailyQueueProps {
  developers: Developer[];
  currentDevIndex: number;
}

export function DailyQueue({ developers, currentDevIndex }: DailyQueueProps) {
  const getStatusIcon = (status: string, index: number) => {
    if (status === 'completed') return '✓';
    if (index === currentDevIndex) return '→';
    if (status === 'skipped') return '✗';
    return '•';
  };

  const getStatusColor = (status: string, index: number) => {
    if (status === 'completed') return 'text-green-600';
    if (index === currentDevIndex) return 'text-blue-600 font-bold';
    if (status === 'skipped') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="p-4 bg-white border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">✅ Fila Daily:</h3>
      <div className="space-y-2">
        {developers.map((dev, index) => (
          <div key={dev.turnOrder} className={`text-sm flex items-center gap-2 ${getStatusColor(dev.status, index)}`}>
            <span className="font-bold">{getStatusIcon(dev.status, index)}</span>
            <span className={index === currentDevIndex ? 'font-bold' : ''}>{dev.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
