import { Card } from '@/components/ui/card';

interface MiniKanbanProps {
  todo: number;
  doing: number;
  done: number;
}

export function MiniKanban({ todo, doing, done }: MiniKanbanProps) {
  return (
    <Card className="p-4 bg-white border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Kanban</h3>
      <div className="flex justify-between items-center gap-2">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-600 mb-1">TODO</p>
          <p className="text-lg font-bold text-gray-800">{todo}</p>
        </div>
        <div className="flex-1 text-center border-l border-r border-gray-200">
          <p className="text-xs text-gray-600 mb-1">DOING</p>
          <p className="text-lg font-bold text-blue-600">{doing}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-600 mb-1">DONE</p>
          <p className="text-lg font-bold text-green-600">{done}</p>
        </div>
      </div>
    </Card>
  );
}
