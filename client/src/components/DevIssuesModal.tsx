import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Code, User, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DevIssue {
  Key: string;
  Summary: string;
  Assignee: string;
  Status: string;
  IssueType?: string;
}

interface DevIssuesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: DevIssue[];
}

const AVAILABLE_STATUSES = [
  'Dev To Do',
  'CODE DOING',
  'CODE REVIEW',
  'Dev Doing'
];

export function DevIssuesModal({ open, onOpenChange, issues }: DevIssuesModalProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Dev To Do':
        return 'bg-gray-100 text-gray-800';
      case 'CODE DOING':
        return 'bg-blue-100 text-blue-800';
      case 'CODE REVIEW':
        return 'bg-purple-100 text-purple-800';
      case 'Dev Doing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar issues baseado nos status selecionados
  const filteredIssues = useMemo(() => {
    if (selectedStatuses.length === 0) {
      return issues;
    }
    return issues.filter(issue => selectedStatuses.includes(issue.Status));
  }, [issues, selectedStatuses]);

  // Contar issues por status
  const statusCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    AVAILABLE_STATUSES.forEach(status => {
      counts[status] = issues.filter(issue => issue.Status === status).length;
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
            <Code className="w-5 h-5" />
            Issues em Desenvolvimento/Code Review
          </DialogTitle>
        </DialogHeader>

        {/* Filtro por Status */}
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
            {AVAILABLE_STATUSES.map(status => (
              <Button
                key={status}
                variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleStatus(status)}
                className="text-xs"
              >
                {status}
                <span className="ml-1 text-xs opacity-70">
                  ({statusCounts[status]})
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Issues */}
        <div className="space-y-3">
          {filteredIssues.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Exibindo {filteredIssues.length} de {issues.length} issues
              </p>
              {filteredIssues.map((issue) => (
                <div
                  key={issue.Key}
                  className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-semibold text-primary">{issue.Key}</code>
                        {issue.IssueType && (
                          <Badge className="bg-green-100 text-green-800">
                            {issue.IssueType}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(issue.Status)}>
                          {issue.Status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground font-medium">{issue.Summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                    <User className="w-3 h-3" />
                    <span>{issue.Assignee || 'Não atribuído'}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {selectedStatuses.length > 0
                  ? 'Nenhuma issue encontrada com os filtros selecionados.'
                  : 'Nenhuma issue em desenvolvimento no momento.'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
