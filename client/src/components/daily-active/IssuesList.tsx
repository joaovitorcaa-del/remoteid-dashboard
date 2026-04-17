import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface Issue {
  key: string;
  summary: string;
  status: string;
}

interface IssuesListProps {
  issues: Issue[];
  isLoading?: boolean;
}

export function IssuesList({ issues, isLoading }: IssuesListProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-white border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 ISSUES DO SPRINT</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="p-4 bg-white border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 ISSUES DO SPRINT</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle size={16} />
          <span>Nenhuma issue atribuída</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 ISSUES DO SPRINT</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {issues.map(issue => (
          <div key={issue.key} className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-blue-600 text-sm">{issue.key}</span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{issue.status}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{issue.summary}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
