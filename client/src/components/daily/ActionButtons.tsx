import { Button } from '@/components/ui/button';
import { Play, BarChart3 } from 'lucide-react';

interface ActionButtonsProps {
  onStartDaily: () => void;
  onViewBoard: () => void;
  isStarting: boolean;
  disabled?: boolean;
}

export function ActionButtons({
  onStartDaily,
  onViewBoard,
  isStarting,
  disabled
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4 pt-2">
      <Button
        size="lg"
        onClick={onStartDaily}
        disabled={isStarting || disabled}
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1"
      >
        {isStarting ? (
          <>
            <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
            Iniciando...
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Iniciar Daily
          </>
        )}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={onViewBoard}
        className="gap-2"
      >
        <BarChart3 className="w-5 h-5" />
        Ver Board Completo
      </Button>
    </div>
  );
}
