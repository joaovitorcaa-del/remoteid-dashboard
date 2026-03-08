import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';


interface JqlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJql: (jql: string) => void;
}

export function JqlModal({ open, onOpenChange, onSelectJql }: JqlModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  
  const showToast = (message: string, isError = false) => {
    console.log(isError ? 'Error:' : 'Success:', message);
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [jql, setJql] = useState('');
  const [descricao, setDescricao] = useState('');

  // Queries
  const { data: filters = [], refetch } = trpc.jqlFilters.list.useQuery();

  // Mutations
  const createMutation = trpc.jqlFilters.create.useMutation({
    onSuccess: () => {
      showToast('Filtro criado com sucesso!');
      setNome('');
      setJql('');
      setDescricao('');
      setIsCreating(false);
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao criar filtro: ${error.message}`, true);
    },
  });

  const updateMutation = trpc.jqlFilters.update.useMutation({
    onSuccess: () => {
      showToast('Filtro atualizado com sucesso!');
      setEditingId(null);
      setNome('');
      setJql('');
      setDescricao('');
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao atualizar filtro: ${error.message}`, true);
    },
  });

  const deleteMutation = trpc.jqlFilters.delete.useMutation({
    onSuccess: () => {
      showToast('Filtro deletado com sucesso!');
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao deletar filtro: ${error.message}`, true);
    },
  });

  const handleCreate = () => {
    if (!nome.trim() || !jql.trim()) {
      showToast('Nome e JQL são obrigatórios', true);
      return;
    }
    createMutation.mutate({ nome, jql, descricao });
  };

  const handleUpdate = (id: number) => {
    if (!nome.trim() || !jql.trim()) {
      showToast('Nome e JQL são obrigatórios', true);
      return;
    }
    updateMutation.mutate({ id, nome, jql, descricao });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja deletar este filtro?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSelectFilter = (filter: any) => {
    onSelectJql(filter.jql);
    onOpenChange(false);
  };

  const handleEditFilter = (filter: any) => {
    setEditingId(filter.id);
    setNome(filter.nome);
    setJql(filter.jql);
    setDescricao(filter.descricao || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNome('');
    setJql('');
    setDescricao('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Filtros JQL</DialogTitle>
        </DialogHeader>

        {/* Criar/Editar Filtro */}
        <div className="space-y-3 pb-4 border-b">
          <h3 className="text-sm font-semibold">
            {editingId ? 'Editar Filtro' : 'Criar Novo Filtro'}
          </h3>
          <div className="space-y-2">
            <Input
              placeholder="Nome do filtro"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            <textarea
              placeholder="JQL"
              value={jql}
              onChange={(e) => setJql(e.target.value)}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full p-2 border rounded text-sm font-mono"
              rows={3}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            <div className="flex gap-2">
              {editingId ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(editingId)}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Filtro
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Filtros */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Filtros Salvos</h3>
          {filters.length > 0 ? (
            <div className="space-y-2">
              {filters.map((filter) => (
                <div
                  key={filter.id}
                  className="p-3 border rounded-lg bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{filter.nome}</h4>
                        {filter.descricao && (
                          <span className="text-xs text-muted-foreground">{filter.descricao}</span>
                        )}
                      </div>
                      <code className="text-xs bg-muted p-1 rounded block break-all">
                        {filter.jql}
                      </code>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectFilter(filter)}
                      >
                        Usar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditFilter(filter)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(filter.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum filtro salvo ainda.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
