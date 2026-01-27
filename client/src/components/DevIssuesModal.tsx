import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Code, User } from 'lucide-react';

interface DevIssue {
  Key: string;
  Summary: string;
  Assignee: string;
  Status: string;
}

interface DevIssuesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: DevIssue[];
}

export function DevIssuesModal({ open, onOpenChange, issues }: DevIssuesModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Issues em Desenvolvimento/Code Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {issues.length > 0 ? (
            issues.map((issue) => (
              <div
                key={issue.Key}
                className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm font-semibold text-primary">{issue.Key}</code>
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
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma issue em desenvolvimento no momento.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
