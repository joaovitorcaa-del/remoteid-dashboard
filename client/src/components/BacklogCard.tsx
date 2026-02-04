import { Package } from 'lucide-react';

interface BacklogItem {
  key: string;
  summary: string;
  issueType: string;
  status: string;
}

interface BacklogCardProps {
  items: BacklogItem[];
  count: number;
  isLoading?: boolean;
}

export function BacklogCard({ items, count, isLoading = false }: BacklogCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Backlog</h3>
        <Package className="w-5 h-5 text-blue-600" />
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold text-blue-600">{count}</div>
        <p className="text-sm text-muted-foreground">Ready to Sprint</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Carregando backlog...
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="p-2 rounded bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {item.key}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 whitespace-nowrap">
                    {item.issueType}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-1 line-clamp-2">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum item no backlog
        </p>
      )}
    </div>
  );
}
