import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  highlight?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  highlight = false,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-6 transition-all hover:shadow-md h-full ${
        onClick ? 'cursor-pointer hover:bg-secondary/50' : ''
      } ${
        highlight
          ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold font-display text-foreground">{value}</p>
            {trendValue && (
              <span
                className={`text-sm font-semibold ${
                  trend === 'up'
                    ? 'text-[#10B981]'
                    : trend === 'down'
                      ? 'text-[#EF4444]'
                      : 'text-muted-foreground'
                }`}
              >
                {trendValue}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        </div>
        <div className="p-3 rounded-lg bg-secondary">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
