import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'red' | 'yellow' | 'green';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    green: {
      bgColor: 'bg-[#10B981] bg-opacity-10',
      textColor: 'text-[#10B981]',
      borderColor: 'border-[#10B981]',
      icon: CheckCircle2,
    },
    yellow: {
      bgColor: 'bg-[#F59E0B] bg-opacity-10',
      textColor: 'text-[#F59E0B]',
      borderColor: 'border-[#F59E0B]',
      icon: AlertTriangle,
    },
    red: {
      bgColor: 'bg-[#EF4444] bg-opacity-10',
      textColor: 'text-[#EF4444]',
      borderColor: 'border-[#EF4444]',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`w-5 h-5 ${config.textColor}`} />
      <span className={`font-semibold text-sm ${config.textColor}`}>{label}</span>
    </div>
  );
}
