import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, Tag, Filter, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilter } from '@/contexts/FilterContext';
import { trpc } from '@/lib/trpc';

interface CompletedIssue {
  chave: string;
  resumo: string;
  atribuido: string;
  tipoIssue: string;
}

interface CompletedIssuesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPLETED_STATUSES = ['Done'];

export function CompletedIssuesModal({ open, onOpenChange }: CompletedIssuesModalProps) {
  const { activeJqlFilter } = useFilter();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [issues, setIssues] = useState<CompletedIssue[]>([]);

  // Buscar issues do Jira usando JQL
  const issuesQuery = trpc.dashboard.getIssuesByStatus.useQuery(
    {
      jql: activeJqlFilter?.jql || '',
      statuses: COMPLETED_STATUSES,
    },
    { enabled: open && !!activeJqlFilter?.jql }
  );

  useEffect(() => {
    if (issuesQuery.data?.issues) {
      // Converter SyncedIssue para CompletedIssue
      const convertedIssues = issuesQuery.data.issues.map((issue: any) => ({
        chave: issue.chave,
        resumo: issue.resumo,
        atribuido: issue.atribuido || 'Nao atribuido',
        tipoIssue: issue.tipoIssue || 'Task',
      }));
      setIssues(convertedIssues);
    }
  }, [issuesQuery.data]);

  // Filtrar issues baseado nos tipos selecionados
  const filteredIssues = useMemo(() => {
    if (selectedTypes.length === 0) {
      return issues;
    }
    return issues.filter(issue => selectedTypes.includes(issue.tipoIssue));
  }, [issues, selectedTypes]);

  // Contar issues por tipo
  const typeCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const uniqueTypes = Array.from(new Set(issues.map(i => i.tipoIssue)));
    uniqueTypes.forEach(type => {
      counts[type] = issues.filter(issue => issue.tipoIssue === type).length;
    });
    return counts;
  }, [issues]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
  };
  
  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'Bug':
        return 'bg-red-100 text-red-800';
      case 'Improvement':
        return 'bg-blue-100 text-blue-800';
      case 'Tests':
        return 'bg-green-100 text-green-800';
      case 'Task':
        return 'bg-yellow-100 text-yellow-800';
      case 'Story':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Issues Concluidas (Ultimas 24h)
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
            {/* Filtro por Tipo de Issue */}
            {Array.from(new Set(issues.map(i => i.tipoIssue))).length > 0 && (
              <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Filtrar por Tipo:</span>
                  {selectedTypes.length > 0 && (
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
                  {Array.from(new Set(issues.map(i => i.tipoIssue))).map(type => (
                    <Button
                      key={type}
                      variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleType(type)}
                      className="text-xs"
                    >
                      {type}
                      <span className="ml-1 text-xs opacity-70">
                        ({typeCounts[type] || 0})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
                          <Badge className={getIssueTypeColor(issue.tipoIssue)}>
                            {issue.tipoIssue}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Concluida
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
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {selectedTypes.length > 0
                      ? 'Nenhuma issue encontrada com os filtros selecionados.'
                      : 'Nenhuma issue foi concluida nas ultimas 24 horas.'}
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
