import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, User, Filter, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilter } from '@/contexts/FilterContext';
import { trpc } from '@/lib/trpc';

interface ReadyIssue {
  chave: string;
  resumo: string;
  atribuido: string;
  status: string;
  tipoIssue?: string;
}

interface ReadyToSprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const READY_STATUSES = ['Ready to Sprint', 'Dev To Do'];

export function ReadyToSprintModal({ open, onOpenChange }: ReadyToSprintModalProps) {
  const { activeJqlFilter } = useFilter();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [issues, setIssues] = useState<ReadyIssue[]>([]);

  const issuesQuery = trpc.dashboard.getIssuesByStatus.useQuery(
    {
      jql: activeJqlFilter?.jql || '',
      statuses: READY_STATUSES,
    },
    { enabled: open && !!activeJqlFilter?.jql }
  );

  useEffect(() => {
    if (issuesQuery.data?.issues) {
      const convertedIssues = issuesQuery.data.issues.map((issue: any) => ({
        chave: issue.chave,
        resumo: issue.resumo,
        atribuido: issue.atribuido || 'Nao atribuido',
        status: issue.status,
        tipoIssue: issue.tipoIssue,
      }));
      setIssues(convertedIssues);
    }
  }, [issuesQuery.data]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready to sprint':
        return 'bg-blue-100 text-blue-800';
      case 'dev to do':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredIssues = useMemo(() => {
    if (selectedStatuses.length === 0) {
      return issues;
    }
    return issues.filter(issue => selectedStatuses.includes(issue.status));
  }, [issues, selectedStatuses]);

  const statusCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    READY_STATUSES.forEach(status => {
      counts[status] = issues.filter(issue => issue.status === status).length;
    });
    return counts;
  }, [issues]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Issues Prontas para Sprint
          </DialogTitle>
        </DialogHeader>

        {issuesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : issuesQuery.error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">Erro ao buscar issues: {issuesQuery.error.message}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtrar por Status:</span>
                {selectedStatuses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto h-7 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {READY_STATUSES.map(status => (
                  <Button
                    key={status}
                    variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(status)}
                    className="text-xs"
                  >
                    {status}
                    <span className="ml-1 text-xs opacity-70">
                      ({statusCounts[status] || 0})
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredIssues.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Exibindo {filteredIssues.length} de {issues.length} issues
                  </p>
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.chave}
                      className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm font-semibold text-primary">{issue.chave}</code>
                            {issue.tipoIssue && (
                              <Badge className="bg-green-100 text-green-800">
                                {issue.tipoIssue}
                              </Badge>
                            )}
                            <Badge className={getStatusColor(issue.status)}>
                              {issue.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground font-medium">{issue.resumo}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                        <User className="w-3 h-3" />
                        <span>{issue.atribuido}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {selectedStatuses.length > 0
                      ? 'Nenhuma issue encontrada com os filtros selecionados.'
                      : 'Nenhuma issue pronta para sprint no momento.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
