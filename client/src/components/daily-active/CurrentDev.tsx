import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';

interface CurrentDevProps {
  name: string;
}

export function CurrentDev({ name }: CurrentDevProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
      <div className="flex items-center gap-3">
        <User size={24} />
        <div>
          <p className="text-xs opacity-90">Dev Atual</p>
          <p className="text-lg font-bold">{name}</p>
        </div>
      </div>
    </Card>
  );
}
