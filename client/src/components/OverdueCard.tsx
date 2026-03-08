import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';

interface OverdueIssue {
  chave: string;
  resumo: string;
  responsavel: string;
  dataFim: Date | string;
  storyPoints: number;
  status: string;
}

interface OverdueCardProps {
  issues: OverdueIssue[];
  isLoading?: boolean;
}

export function OverdueCard({ issues, isLoading = false }: OverdueCardProps) {
  const [showModal, setShowModal] = useState(false);

  const calculateDaysOverdue = (dataFim: Date | string): number => {
    const endDate = new Date(dataFim);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedIssues = [...issues].sort((a, b) => 
    calculateDaysOverdue(b.dataFim) - calculateDaysOverdue(a.dataFim)
  );

  const getUrgencyColor = (daysOverdue: number): string => {
    if (daysOverdue >= 7) return 'bg-red-100 text-red-800';
    if (daysOverdue >= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (isLoading) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Issues Atrasadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <AlertCircle className="w-5 h-5" />
            Issues Atrasadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">✓ Nenhuma issue atrasada!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setShowModal(true)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Issues Atrasadas
            </div>
            <Badge variant="destructive" className="text-lg">
              {issues.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {issues.length === 1 ? '1 issue' : `${issues.length} issues`} com prazo vencido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedIssues.slice(0, 3).map((issue) => {
              const daysOverdue = calculateDaysOverdue(issue.dataFim);
              return (
                <div key={issue.chave} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold">{issue.chave}</p>
                    <p className="text-xs text-muted-foreground truncate">{issue.resumo}</p>
                  </div>
                  <Badge className={getUrgencyColor(daysOverdue)}>
                    {daysOverdue}d
                  </Badge>
                </div>
              );
            })}
            {issues.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowModal(true)}
              >
                Ver todas ({issues.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal com todas as issues */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issues Atrasadas ({issues.length})</DialogTitle>
            <DialogDescription>
              Todas as issues com prazo vencido, ordenadas por urgência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {sortedIssues.map((issue) => {
              const daysOverdue = calculateDaysOverdue(issue.dataFim);
              const endDateStr = new Date(issue.dataFim).toLocaleDateString('pt-BR');
              
              return (
                <div
                  key={issue.chave}
                  className="p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{issue.chave}</span>
                        <Badge variant="outline" className="text-xs">
                          {issue.storyPoints} SP
                        </Badge>
                        <Badge className={getUrgencyColor(daysOverdue)}>
                          {daysOverdue} dias atrasada
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{issue.resumo}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Responsável: {issue.responsavel}</span>
                        <span>Prazo: {endDateStr}</span>
                        <span>Status: {issue.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
