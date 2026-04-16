import { Button } from '@/components/ui/button';
import { History, RefreshCw, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onHistory: () => void;
  onStartDaily: () => void;
  isRefreshing: boolean;
  isStarting: boolean;
  lastUpdated?: Date;
}

export function DashboardHeader({
  onRefresh,
  onHistory,
  onStartDaily,
  isRefreshing,
  isStarting,
  lastUpdated
}: DashboardHeaderProps) {
  const today = format(new Date(), "EEEE',' dd 'de' MMMM", { locale: ptBR });
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);
  
  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{capitalizedToday}</p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                Atualizado há {Math.round((Date.now() - lastUpdated.getTime()) / 60000)} minutos
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onHistory}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Histórico
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              onClick={onStartDaily}
              disabled={isStarting}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Iniciar Daily
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
