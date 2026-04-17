import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface QuickStatusProps {
  completedTasks: boolean;
  hasWorkInProgress: boolean;
  willStartNewTask: boolean;
  hasBlockers: boolean;
  onCompletedTasksChange: (value: boolean) => void;
  onWorkInProgressChange: (value: boolean) => void;
  onWillStartNewTaskChange: (value: boolean) => void;
  onBlockersChange: (value: boolean) => void;
}

export function QuickStatus({
  completedTasks,
  hasWorkInProgress,
  willStartNewTask,
  hasBlockers,
  onCompletedTasksChange,
  onWorkInProgressChange,
  onWillStartNewTaskChange,
  onBlockersChange,
}: QuickStatusProps) {
  return (
    <Card className="p-4 bg-white border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ STATUS RÁPIDO</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="completed"
            checked={completedTasks}
            onCheckedChange={onCompletedTasksChange}
          />
          <label htmlFor="completed" className="text-sm text-gray-700 cursor-pointer">
            ☑ Concluí tarefas
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="inProgress"
            checked={hasWorkInProgress}
            onCheckedChange={onWorkInProgressChange}
          />
          <label htmlFor="inProgress" className="text-sm text-gray-700 cursor-pointer">
            ☐ Tenho trabalho em progresso
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="newTask"
            checked={willStartNewTask}
            onCheckedChange={onWillStartNewTaskChange}
          />
          <label htmlFor="newTask" className="text-sm text-gray-700 cursor-pointer">
            ☐ Vou iniciar nova tarefa
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="blockers"
            checked={hasBlockers}
            onCheckedChange={onBlockersChange}
          />
          <label htmlFor="blockers" className="text-sm text-gray-700 cursor-pointer">
            ☑ Tenho impedimento/dependência
          </label>
        </div>
      </div>
    </Card>
  );
}
