import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackToastProps {
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 = never auto-close
  onClose?: () => void;
  id?: string;
}

const typeConfig = {
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700',
    icon: AlertCircle,
    iconColor: 'text-red-600',
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-900',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-700',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700',
    icon: Info,
    iconColor: 'text-blue-600',
  },
};

export function FeedbackToast({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  id,
}: FeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duration === 0) return; // Never auto-close

    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      key={id}
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-lg shadow-md p-4 mb-3
        flex items-start gap-3
        animate-in fade-in slide-in-from-top-2 duration-300
        transition-all
      `}
    >
      {/* Icon */}
      <Icon className={`${config.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`${config.titleColor} font-semibold text-sm`}>{title}</h3>
        {message && (
          <p className={`${config.messageColor} text-sm mt-1`}>{message}</p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className={`${config.textColor} hover:opacity-70 flex-shrink-0 transition-opacity`}
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default FeedbackToast;
