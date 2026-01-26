import { AlertCircle, AlertTriangle } from 'lucide-react';
import { CriticalIssue } from '@/data/dashboardData';

interface CriticalIssuesListProps {
  issues: CriticalIssue[];
}

export function CriticalIssuesList({ issues }: CriticalIssuesListProps) {
  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <div
          key={issue.key}
          className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
        >
          <div className="flex-shrink-0 pt-1">
            {issue.impact === 'critical' ? (
              <AlertCircle className="w-5 h-5 text-[#EF4444]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-primary">{issue.key}</span>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {issue.status}
              </span>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{issue.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
