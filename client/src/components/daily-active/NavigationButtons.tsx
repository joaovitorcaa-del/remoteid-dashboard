import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  onFlag: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLoading?: boolean;
}

export function NavigationButtons({
  onPrevious,
  onNext,
  onFlag,
  canGoPrevious,
  canGoNext,
  isLoading = false,
}: NavigationButtonsProps) {
  return (
    <div className="flex gap-2 justify-between items-center">
      <Button
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <ChevronLeft size={16} />
        Anterior
      </Button>

      <Button
        onClick={onFlag}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Flag size={16} />
        ⚡Flag
      </Button>

      <Button
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        Próximo Dev
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
