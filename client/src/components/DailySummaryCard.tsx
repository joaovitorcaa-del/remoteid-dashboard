import { Download, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DailySummaryData {
  completionRate24h: number;
  issuesCompletedToday: number;
  issuesInProgress: number;
  blockedCount: number;
  overdueCount: number;
}

interface DailySummaryCardProps {
  data: DailySummaryData;
  isLoading?: boolean;
  onGenerateReport?: () => void;
  onShare?: () => void;
}

export function DailySummaryCard({ 
  data, 
  isLoading = false, 
  onGenerateReport,
  onShare 
}: DailySummaryCardProps) {
  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-700';
    if (rate >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumo Daily</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Daily</CardTitle>
        <CardDescription>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão (24h)</p>
              <p className={`text-3xl font-bold ${getCompletionColor(data.completionRate24h)}`}>
                {data.completionRate24h}%
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {data.issuesCompletedToday} concluídas
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {data.issuesInProgress} em progresso
                </Badge>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            {data.blockedCount > 0 && (
              <div className="p-2 bg-orange-50 rounded border border-orange-200">
                <p className="text-xs text-muted-foreground">Bloqueadores</p>
                <p className="text-lg font-bold text-orange-700">{data.blockedCount}</p>
              </div>
            )}
            {data.overdueCount > 0 && (
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-lg font-bold text-red-700">{data.overdueCount}</p>
              </div>
            )}
            {data.blockedCount === 0 && data.overdueCount === 0 && (
              <div className="p-2 bg-green-50 rounded border border-green-200 col-span-2">
                <p className="text-xs text-green-700">✓ Nenhum bloqueador ou atraso</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {onGenerateReport && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onGenerateReport}
              >
                <Download className="w-4 h-4 mr-1" />
                Gerar PDF
              </Button>
            )}
            {onShare && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Compartilhar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
