import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface BlockersInputProps {
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
}

export function BlockersInput({ value, onChange, isVisible }: BlockersInputProps) {
  if (!isVisible) return null;

  return (
    <Card className="p-4 bg-red-50 border-red-200">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={18} className="text-red-600" />
        <h3 className="text-sm font-semibold text-red-700">🚫 IMPEDIMENTOS (se marcado)</h3>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Descreva o impedimento ou dependência..."
        className="min-h-20 resize-none bg-white border-red-200"
      />
    </Card>
  );
}
