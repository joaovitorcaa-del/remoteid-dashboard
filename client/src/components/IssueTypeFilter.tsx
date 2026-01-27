import { useFilter } from '@/contexts/FilterContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IssueTypeFilterProps {
  issueTypes: string[];
}

export function IssueTypeFilter({ issueTypes }: IssueTypeFilterProps) {
  const { selectedIssueType, setSelectedIssueType } = useFilter();

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-foreground">Filtrar por Tipo:</label>
      <Select value={selectedIssueType || ''} onValueChange={(value) => setSelectedIssueType(value || null)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos os tipos</SelectItem>
          {issueTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedIssueType && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedIssueType(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
