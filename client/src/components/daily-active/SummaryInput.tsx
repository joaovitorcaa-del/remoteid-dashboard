import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface SummaryInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function SummaryInput({ value, onChange, maxLength = 280 }: SummaryInputProps) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining < 50;

  return (
    <Card className="p-4 bg-white border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">💬 RESUMO (max {maxLength} chars)</h3>
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Descreva o que você fez hoje..."
          className="min-h-24 resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Pressione Tab para próximo campo</span>
          <span className={`text-xs font-semibold ${isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
            {value.length}/{maxLength}
          </span>
        </div>
      </div>
    </Card>
  );
}
