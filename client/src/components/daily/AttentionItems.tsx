import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AttentionItemsProps {
  unassignedCount: number;
  devsWithoutUpdate: number;
  prsAwaitingReview: number;
  blockersCount: number;
  isLoading?: boolean;
}

export function AttentionItems({
  unassignedCount,
  devsWithoutUpdate,
  prsAwaitingReview,
  blockersCount,
  isLoading
}: AttentionItemsProps) {
  const hasItems = unassignedCount > 0 || devsWithoutUpdate > 0 || prsAwaitingReview > 0 || blockersCount > 0;

  if (isLoading) {
    return (
      <Card className="border-yellow-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-5 h-5" />
            Itens de Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5" />
          Itens de Atenção
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {unassignedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-800 p-2 bg-yellow-50 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{unassignedCount} itens sem assignee</span>
            </div>
          )}
          {devsWithoutUpdate > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-800 p-2 bg-yellow-50 rounded">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{devsWithoutUpdate} devs sem atualização hoje</span>
            </div>
          )}
          {prsAwaitingReview > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-800 p-2 bg-yellow-50 rounded">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{prsAwaitingReview} PRs aguardando review</span>
            </div>
          )}
          {blockersCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-700 p-2 bg-red-50 rounded">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{blockersCount} issues paradas há mais de 3 dias</span>
            </div>
          )}
          {!hasItems && (
            <p className="text-sm text-gray-500">Nenhum item de atenção no momento.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
