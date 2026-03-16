import { useState } from 'react';
import { Trash2, Edit2, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RetroAction {
  id: number;
  titulo: string;
  descricao?: string | null;
  responsavel?: string | null;
  status: 'Aberta' | 'Em Progresso' | 'Concluída' | 'Cancelada';
  prioridade: 'Baixa' | 'Média' | 'Alta';
  dataVencimento?: string | Date | null;
}

interface RetroActionsTableProps {
  actions: RetroAction[];
  onAddAction?: () => void;
  onEditAction?: (action: RetroAction) => void;
  onDeleteAction?: (id: number) => void;
  onUpdateStatus?: (id: number, status: RetroAction['status']) => void;
}

const statusColors: Record<RetroAction['status'], string> = {
  'Aberta': 'bg-red-100 text-red-800',
  'Em Progresso': 'bg-yellow-100 text-yellow-800',
  'Concluída': 'bg-green-100 text-green-800',
  'Cancelada': 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<RetroAction['prioridade'], string> = {
  'Baixa': 'text-blue-600',
  'Média': 'text-yellow-600',
  'Alta': 'text-red-600',
};

const statusIcons: Record<RetroAction['status'], React.ReactNode> = {
  'Aberta': <AlertCircle className="w-4 h-4" />,
  'Em Progresso': <Clock className="w-4 h-4" />,
  'Concluída': <CheckCircle2 className="w-4 h-4" />,
  'Cancelada': <AlertCircle className="w-4 h-4" />,
};

export function RetroActionsTable({
  actions,
  onAddAction,
  onEditAction,
  onDeleteAction,
  onUpdateStatus,
}: RetroActionsTableProps) {
  const [selectedAction, setSelectedAction] = useState<RetroAction | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleStatusChange = (action: RetroAction, newStatus: RetroAction['status']) => {
    if (onUpdateStatus) {
      onUpdateStatus(action.id, newStatus);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Ações da Retrospectiva</h3>
        {onAddAction && (
          <Button
            onClick={onAddAction}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Ação
          </Button>
        )}
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma ação registrada ainda</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Ação</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Responsável</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Prioridade</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Vencimento</th>
                <th className="text-right py-3 px-4 font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr
                  key={action.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedAction(action);
                    setShowDetails(true);
                  }}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-foreground">{action.titulo}</p>
                      {action.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{action.descricao}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {action.responsavel || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[action.status]}`}>
                        {statusIcons[action.status]}
                        {action.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${priorityColors[action.prioridade]}`}>
                      {action.prioridade}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {action.dataVencimento ? new Date(action.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEditAction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAction(action);
                          }}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                      {onDeleteAction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Deseja deletar esta ação?')) {
                              onDeleteAction(action.id);
                            }
                          }}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Dialog */}
      {selectedAction && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedAction.titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedAction.descricao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-foreground mt-1">{selectedAction.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                  <p className="text-foreground mt-1">{selectedAction.responsavel || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prioridade</label>
                  <p className={`mt-1 font-medium ${priorityColors[selectedAction.prioridade]}`}>
                    {selectedAction.prioridade}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusColors[selectedAction.status]}`}>
                    {statusIcons[selectedAction.status]}
                    {selectedAction.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vencimento</label>
                  <p className="text-foreground mt-1">
                    {selectedAction.dataVencimento
                      ? new Date(selectedAction.dataVencimento).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
              </div>
              {onUpdateStatus && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Alterar Status
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['Aberta', 'Em Progresso', 'Concluída', 'Cancelada'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          handleStatusChange(selectedAction, status);
                          setShowDetails(false);
                        }}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          selectedAction.status === status
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
