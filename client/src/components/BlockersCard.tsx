import { Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';

interface Blocker {
  id: number;
  issueKey: string;
  issueSummary?: string;
  blockedSince: Date | string;
  reason?: string;
  impactSp?: number;
}

interface BlockersCardProps {
  blockers: Blocker[];
  isLoading?: boolean;
  onResolve?: (id: number) => void;
}

export function BlockersCard({ blockers, isLoading = false, onResolve }: BlockersCardProps) {
  const [showModal, setShowModal] = useState(false);

  const calculateDaysBlocked = (blockedSince: Date | string): number => {
    const startDate = new Date(blockedSince);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedBlockers = [...blockers].sort((a, b) => 
    calculateDaysBlocked(b.blockedSince) - calculateDaysBlocked(a.blockedSince)
  );

  const totalImpactSp = blockers.reduce((sum, b) => sum + (b.impactSp || 0), 0);

  if (isLoading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Zap className="w-5 h-5" />
            Bloqueadores Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (blockers.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Zap className="w-5 h-5" />
            Bloqueadores Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">✓ Nenhum bloqueador ativo!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setShowModal(true)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
              <Zap className="w-5 h-5" />
              Bloqueadores Ativos
            </div>
            <Badge variant="secondary" className="text-lg">
              {blockers.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {totalImpactSp > 0 && `${totalImpactSp} SP bloqueados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedBlockers.slice(0, 3).map((blocker) => {
              const daysBlocked = calculateDaysBlocked(blocker.blockedSince);
              return (
                <div key={blocker.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold">{blocker.issueKey}</p>
                    {blocker.reason && (
                      <p className="text-xs text-muted-foreground">{blocker.reason}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {daysBlocked}d
                  </Badge>
                </div>
              );
            })}
            {blockers.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowModal(true)}
              >
                Ver todos ({blockers.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal com todos os bloqueadores */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bloqueadores Ativos ({blockers.length})</DialogTitle>
            <DialogDescription>
              Issues bloqueadas, ordenadas por tempo de bloqueio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {sortedBlockers.map((blocker) => {
              const daysBlocked = calculateDaysBlocked(blocker.blockedSince);
              const startDateStr = new Date(blocker.blockedSince).toLocaleDateString('pt-BR');
              
              return (
                <div
                  key={blocker.id}
                  className="p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{blocker.issueKey}</span>
                        {blocker.impactSp && (
                          <Badge variant="outline" className="text-xs">
                            {blocker.impactSp} SP
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {daysBlocked} dias bloqueada
                        </Badge>
                      </div>
                      {blocker.issueSummary && (
                        <p className="text-sm text-muted-foreground mb-1">{blocker.issueSummary}</p>
                      )}
                      {blocker.reason && (
                        <div className="text-xs bg-orange-100 text-orange-800 p-2 rounded mt-1">
                          <strong>Motivo:</strong> {blocker.reason}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Bloqueada desde: {startDateStr}
                      </p>
                    </div>
                    {onResolve && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(blocker.id);
                        }}
                      >
                        Resolver
                      </Button>
                    )}
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
