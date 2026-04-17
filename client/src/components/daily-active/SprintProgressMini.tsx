import { Card } from '@/components/ui/card';

interface SprintProgressMiniProps {
  completed: number;
  total: number;
  percentage: number;
}

export function SprintProgressMini({ completed, total, percentage }: SprintProgressMiniProps) {
  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Sprint: {percentage}%</h3>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-600">{completed}/{total} issues</p>
      </div>
    </Card>
  );
}
