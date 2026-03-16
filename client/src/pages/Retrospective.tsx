import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RetroActionsTable } from '@/components/RetroActionsTable';
import { QualityMetricsCard } from '@/components/QualityMetricsCard';
import { BlockingPatternsCard } from '@/components/BlockingPatternsCard';
import { trpc } from '@/lib/trpc';

interface RetroAction {
  id: number;
  titulo: string;
  descricao?: string | null;
  responsavel?: string | null;
  status: 'Aberta' | 'Em Progresso' | 'Concluída' | 'Cancelada';
  prioridade: 'Baixa' | 'Média' | 'Alta';
  dataVencimento?: string | Date | null;
}

interface BlockingPattern {
  id: number;
  padraoNome: string;
  descricao?: string | null;
  frequencia: number;
  impactoTotal: number | null;
  ultimaOcorrencia?: string | Date | null;
  status: 'Ativo' | 'Resolvido' | 'Monitorando';
}

export default function Retrospective() {
  const [, navigate] = useLocation();
  const [sprintId] = useState(1); // TODO: Get from context or URL
  const [retroActions, setRetroActions] = useState<RetroAction[]>([]);
  const [blockingPatterns, setBlockingPatterns] = useState<BlockingPattern[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState({
    totalBugs: 0,
    bugsFixed: 0,
    bugsDeferred: 0,
    testCoverage: 0 as number | null,
    defectDensity: 0 as number | null,
  });
  const [showActionForm, setShowActionForm] = useState(false);
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    responsavel: '',
    prioridade: 'Média' as const,
    dataVencimento: '',
  });

  // tRPC queries
  const actionsQuery = trpc.retrospective.getActions.useQuery(
    { sprintId },
    { enabled: !!sprintId }
  );

  const patternsQuery = trpc.retrospective.getBlockingPatterns.useQuery();

  const metricsQuery = trpc.retrospective.getQualityMetrics.useQuery(
    { sprintId },
    { enabled: !!sprintId }
  );

  // tRPC mutations
  const createActionMutation = trpc.retrospective.createAction.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
      setShowActionForm(false);
      setFormData({
        titulo: '',
        descricao: '',
        responsavel: '',
        prioridade: 'Média',
        dataVencimento: '',
      });
    },
  });

  const updateStatusMutation = trpc.retrospective.updateActionStatus.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
    },
  });

  const deleteActionMutation = trpc.retrospective.deleteAction.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
    },
  });

  // Update state when queries return data
  useEffect(() => {
    if (actionsQuery.data?.actions) {
      setRetroActions(actionsQuery.data.actions);
    }
  }, [actionsQuery.data]);

  useEffect(() => {
    if (patternsQuery.data?.patterns) {
      setBlockingPatterns(patternsQuery.data.patterns);
    }
  }, [patternsQuery.data]);

  useEffect(() => {
    if (metricsQuery.data?.metrics) {
      setQualityMetrics({
        totalBugs: metricsQuery.data.metrics.totalBugs,
        bugsFixed: metricsQuery.data.metrics.bugsFixed,
        bugsDeferred: metricsQuery.data.metrics.bugsDeferred,
        testCoverage: metricsQuery.data.metrics.testCoverage || 0,
        defectDensity: metricsQuery.data.metrics.defectDensity || 0,
      });
    }
  }, [metricsQuery.data]);

  const handleCreateAction = async () => {
    if (!formData.titulo.trim()) {
      alert('Por favor, preencha o título da ação');
      return;
    }

    await createActionMutation.mutateAsync({
      sprintId,
      titulo: formData.titulo,
      descricao: formData.descricao,
      responsavel: formData.responsavel,
      prioridade: formData.prioridade,
      dataVencimento: formData.dataVencimento ? new Date(formData.dataVencimento) : undefined,
    });
  };

  const handleUpdateStatus = (actionId: number, newStatus: RetroAction['status']) => {
    updateStatusMutation.mutate({
      actionId,
      status: newStatus,
    });
  };

  const handleDeleteAction = (actionId: number) => {
    deleteActionMutation.mutate({
      actionId,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Voltar para Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
              <div>
                <h1 className="text-3xl font-display text-foreground">Retrospectiva</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Análise de ações, qualidade e padrões de bloqueadores
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        <div className="space-y-8">
          {/* Retro Actions Section */}
          <section>
            <RetroActionsTable
              actions={retroActions}
              onAddAction={() => setShowActionForm(true)}
              onDeleteAction={handleDeleteAction}
              onUpdateStatus={handleUpdateStatus}
            />
          </section>

          {/* Quality Metrics and Blocking Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quality Metrics */}
            <section>
              <QualityMetricsCard {...qualityMetrics} />
            </section>

            {/* Blocking Patterns */}
            <section>
              <BlockingPatternsCard patterns={blockingPatterns} />
            </section>
          </div>

          {/* Summary Section */}
          <section className="rounded-lg border border-border p-6 bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Resumo da Retrospectiva</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Ações Abertas</p>
                <p className="text-2xl font-bold text-red-600">
                  {retroActions.filter(a => a.status === 'Aberta').length}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Em Progresso</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {retroActions.filter(a => a.status === 'Em Progresso').length}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {retroActions.filter(a => a.status === 'Concluída').length}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-blue-600">
                  {retroActions.length > 0
                    ? Math.round((retroActions.filter(a => a.status === 'Concluída').length / retroActions.length) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Create Action Dialog */}
      <Dialog open={showActionForm} onOpenChange={setShowActionForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ação de Retrospectiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Título *</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Melhorar cobertura de testes"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada da ação"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <input
                type="text"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Nome do responsável"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Prioridade</label>
                <select
                  value={formData.prioridade}
                  onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowActionForm(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateAction}
                disabled={createActionMutation.isPending}
              >
                {createActionMutation.isPending ? 'Criando...' : 'Criar Ação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
