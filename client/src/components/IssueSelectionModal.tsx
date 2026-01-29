import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface Issue {
  chave: string;
  resumo: string;
  responsavel: string;
  storyPoints: number;
  tipo?: string;
  status?: string;
}

interface IssueSelectionModalProps {
  open: boolean;
  issues: Issue[];
  selectedIssues: string[];
  onSelectionChange: (selectedChaves: string[]) => void;
  onClose: () => void;
}

export function IssueSelectionModal({
  open,
  issues,
  selectedIssues,
  onSelectionChange,
  onClose,
}: IssueSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(
    new Set(selectedIssues)
  );

  const filteredIssues = issues.filter(
    (issue) =>
      issue.chave.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (chave: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(chave)) {
      newSelected.delete(chave);
    } else {
      newSelected.add(chave);
    }
    setLocalSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (localSelected.size === filteredIssues.length) {
      setLocalSelected(new Set());
    } else {
      const allChaves = filteredIssues.map((i) => i.chave);
      setLocalSelected(new Set(allChaves));
    }
  };

  const handleConfirm = () => {
    onSelectionChange(Array.from(localSelected));
    onClose();
  };

  const handleCancel = () => {
    setLocalSelected(new Set(selectedIssues));
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Issues para a Sprint</DialogTitle>
          <DialogDescription>
            Escolha as issues que deseja incluir no planejamento da Sprint
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por chave, resumo ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Select All */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
          <Checkbox
            checked={
              filteredIssues.length > 0 &&
              localSelected.size === filteredIssues.length
            }
            onCheckedChange={handleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Selecionar todos ({filteredIssues.length})
          </label>
        </div>

        {/* Issues List */}
        <ScrollArea className="h-96 border border-border rounded-lg">
          <div className="space-y-2 p-4 pr-3">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma issue encontrada
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.chave}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleToggle(issue.chave)}
                >
                  <Checkbox
                    checked={localSelected.has(issue.chave)}
                    onChange={() => handleToggle(issue.chave)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{issue.chave}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {issue.storyPoints} SP
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {issue.resumo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Responsável: {issue.responsavel}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar ({localSelected.size} selecionadas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
