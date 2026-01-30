import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import GanttChart from '@/components/GanttChart';
import IssueSelectionModal from '@/components/IssueSelectionModal';

interface SelectedIssue {
  chave: string;
  resumo: string;
  responsavel: string;
  storyPoints: number;
  ordem: number;
  dataInicio: string;
  dataFim: string;
}

interface Issue {
  chave: string;
  resumo: string;
  responsavel: string;
  storyPoints: number;
  tipo?: string;
}

interface Sprint {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim: string;
  ativo: number;
  issues?: SelectedIssue[];
}

const formatDate = (date: string | Date): string => {
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date);
};

export default function Planning() {
  const [, navigate] = useLocation();
  const [sprintName, setSprintName] = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd, setSprintEnd] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<SelectedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistorySprint, setSelectedHistorySprint] = useState<Sprint | null>(null);

  const { data: planejamentoIssues, refetch: refetchIssues } = trpc.issues.getPlanejamento.useQuery();
  const { data: activeSprint, refetch: refetchActiveSprint } = trpc.sprints.getActiveWithIssues.useQuery();
  const { data: allSprints, refetch: refetchAllSprints } = trpc.sprints.list.useQuery();

  const createSprintMutation = trpc.sprints.create.useMutation({
    onSuccess: () => {
      toast.success('Sprint criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar Sprint: ${error.message}`);
    },
  });

  const saveIssuesMutation = trpc.sprints.saveIssues.useMutation({
    onSuccess: async () => {
      toast.success('Issues salvas com sucesso!');
      setSprintName('');
      setSprintStart('');
      setSprintEnd('');
      setSelectedIssues([]);
      await refetchActiveSprint();
      await refetchAllSprints();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar issues: ${error.message}`);
    },
  });

  const finishSprintMutation = trpc.sprints.finish.useMutation({
    onSuccess: async () => {
      toast.success('Sprint encerrada com sucesso!');
      await refetchActiveSprint();
      await refetchAllSprints();
    },
    onError: (error) => {
      toast.error(`Erro ao encerrar Sprint: ${error.message}`);
    },
  });

  const finishAndActivateMutation = trpc.sprints.finishAndActivate.useMutation({
    onSuccess: async () => {
      toast.success('Sprint anterior encerrada e nova Sprint ativada!');
      setSprintName('');
      setSprintStart('');
      setSprintEnd('');
      setSelectedIssues([]);
      await refetchActiveSprint();
      await refetchAllSprints();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const reactivateSprintMutation = trpc.sprints.reactivate.useMutation({
    onSuccess: async () => {
      toast.success('Sprint reativada com sucesso!');
      setSelectedHistorySprint(null);
      await refetchActiveSprint();
      await refetchAllSprints();
    },
    onError: (error) => {
      toast.error(`Erro ao reativar Sprint: ${error.message}`);
    },
  });

  const deleteSprintMutation = trpc.sprints.delete.useMutation({
    onSuccess: async () => {
      toast.success('Sprint deletada com sucesso!');
      setSelectedHistorySprint(null);
      await refetchAllSprints();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar Sprint: ${error.message}`);
    },
  });

  useEffect(() => {
    const loadIssues = async () => {
      if (planejamentoIssues) {
        setIssues(planejamentoIssues);
      }
      setLoading(false);
    };
    loadIssues();
  }, [planejamentoIssues]);

  const isDateRangeValid = sprintStart && sprintEnd && new Date(sprintStart) < new Date(sprintEnd);

  const handleModalConfirm = (selectedKeys: string[]) => {
    const selected: SelectedIssue[] = selectedKeys
      .map((key) => {
        const issue = issues.find((i) => i.chave === key);
        if (!issue) return null;

        const ordem = selectedKeys.indexOf(key);
        const storyPoints = issue.storyPoints;
        const daysForSP = storyPoints <= 3 ? 0.5 : storyPoints <= 5 ? 1 : storyPoints <= 8 ? 2 : storyPoints <= 13 ? 3 : Math.ceil(storyPoints / 5);

        const startDate = new Date(sprintStart + 'T00:00:00Z');
        let endDate = new Date(startDate);
        let daysAdded = 0;

        while (daysAdded < daysForSP) {
          endDate.setUTCDate(endDate.getUTCDate() + 1);
          const dayOfWeek = endDate.getUTCDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
          }
        }

        return {
          chave: key,
          resumo: issue.resumo,
          responsavel: issue.responsavel,
          storyPoints: issue.storyPoints,
          ordem,
          dataInicio: sprintStart,
          dataFim: endDate.toISOString().split('T')[0],
        };
      })
      .filter((item): item is SelectedIssue => item !== null);

    setSelectedIssues(selected);
    setIsModalOpen(false);
  };

  const handleIssueSelect = (issue: SelectedIssue, selected: boolean) => {
    if (selected) {
      setSelectedIssues([...selectedIssues, issue]);
    } else {
      setSelectedIssues(selectedIssues.filter((i) => i.chave !== issue.chave));
    }
  };

  const handleIssueUpdate = (chave: string, dataInicio: string, dataFim: string) => {
    setSelectedIssues(
      selectedIssues.map((issue) =>
        issue.chave === chave ? { ...issue, dataInicio, dataFim } : issue
      )
    );
  };

  const handleSavePlan = async () => {
    if (!sprintName || !sprintStart || !sprintEnd || selectedIssues.length === 0) {
      toast.error('Preencha todos os campos e selecione pelo menos uma issue');
      return;
    }

    try {
      const sprintResult = await createSprintMutation.mutateAsync({
        nome: sprintName,
        dataInicio: sprintStart,
        dataFim: sprintEnd,
      });

      if (!sprintResult.id) {
        toast.error('Erro ao criar Sprint');
        return;
      }

      if (activeSprint && activeSprint.ativo === 1) {
        const shouldFinish = confirm(`Deseja encerrar a Sprint ativa "${activeSprint.nome}" e ativar a nova Sprint?`);
        if (shouldFinish) {
          await finishAndActivateMutation.mutateAsync({
            oldSprintId: activeSprint.id,
            newSprintId: sprintResult.id,
            issues: selectedIssues,
          });
        }
      } else {
        await saveIssuesMutation.mutateAsync({
          sprintId: sprintResult.id,
          issues: selectedIssues,
        });
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
    }
  };

  const handleReactivateSprint = (sprintId: number) => {
    if (confirm('Tem certeza que deseja reativar esta Sprint?')) {
      reactivateSprintMutation.mutate({ sprintId });
    }
  };

  const handleDeleteSprint = (sprintId: number) => {
    if (confirm('Tem certeza que deseja deletar esta Sprint?')) {
      deleteSprintMutation.mutate({ sprintId });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planning</h1>
            <p className="text-sm text-muted-foreground">Planejamento de Sprints</p>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Sprint Ativa Salva - TOPO */}
        {allSprints && allSprints.length > 0 ? (
          <Card className={activeSprint ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-gray-300 bg-gray-50 dark:bg-gray-900"}>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex flex-row items-center justify-between">
                <CardTitle className={activeSprint ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}>
                  {activeSprint ? `✅ ${activeSprint.nome}-Ativa` : "📋 Sem Sprint Ativa"}
                </CardTitle>
                {activeSprint && (
                  <Button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja encerrar a Sprint "${activeSprint.nome}"?`)) {
                        finishSprintMutation.mutate({ sprintId: activeSprint.id });
                      }
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    Encerrar Sprint
                  </Button>
                )}
              </div>
              {/* Seletor de Sprints Anteriores */}
              {allSprints.filter(s => !s.ativo).length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sprint-history-select" className="text-xs font-medium">Visualizar Sprint anterior:</Label>
                  <select
                    id="sprint-history-select"
                    onChange={(e) => {
                      const sprintId = parseInt(e.target.value);
                      const sprint = allSprints.find(s => s.id === sprintId);
                      setSelectedHistorySprint(sprint || null);
                    }}
                    value={selectedHistorySprint?.id || ''}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                  >
                    <option value="">-- Selecione uma Sprint encerrada --</option>
                    {allSprints
                      .filter(s => !s.ativo)
                      .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
                      .map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.nome}-Encerrada ({formatDate(sprint.dataInicio)} a {formatDate(sprint.dataFim)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSprint ? (
                <>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {formatDate(activeSprint.dataInicio)} a {formatDate(activeSprint.dataFim)}
                    {activeSprint.issues && ` • ${activeSprint.issues.length} issue(ns)`}
                  </p>
                  <GanttChart
                    issues={activeSprint.issues || []}
                    sprintStart={activeSprint.dataInicio}
                    sprintEnd={activeSprint.dataFim}
                    onIssueUpdate={handleIssueUpdate}
                    onIssueRemove={() => {}}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">
                  Nenhuma Sprint ativa no momento. Crie uma nova Sprint abaixo.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Exibir Gantt da Sprint Anterior Selecionada */}
        {selectedHistorySprint && (
          <Card className="border-gray-400 bg-gray-50 dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-700 dark:text-gray-300">
                {selectedHistorySprint.nome}-Encerrada
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReactivateSprint(selectedHistorySprint.id)}
                  variant="default"
                  size="sm"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reativar
                </Button>
                <Button
                  onClick={() => handleDeleteSprint(selectedHistorySprint.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Deletar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(selectedHistorySprint.dataInicio)} a {formatDate(selectedHistorySprint.dataFim)}
                {selectedHistorySprint.issues && ` • ${selectedHistorySprint.issues.length} issue(ns)`}
              </p>
              <GanttChart
                issues={selectedHistorySprint.issues || []}
                sprintStart={selectedHistorySprint.dataInicio}
                sprintEnd={selectedHistorySprint.dataFim}
                onIssueUpdate={() => {}}
                onIssueRemove={() => {}}
              />
            </CardContent>
          </Card>
        )}

        {/* Configurar Nova Sprint */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Nova Sprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sprint-name">Nome da Sprint</Label>
                <Input
                  id="sprint-name"
                  placeholder="Ex: Sprint 1"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sprint-start">Data de Início</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  value={sprintStart}
                  onChange={(e) => setSprintStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sprint-end">Data de Fim</Label>
                <Input
                  id="sprint-end"
                  type="date"
                  value={sprintEnd}
                  onChange={(e) => setSprintEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Selecionar Issues
              </Button>
            </div>

            {selectedIssues.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Issues Selecionadas ({selectedIssues.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedIssues.map((issue) => (
                    <div key={issue.chave} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground leading-tight">{issue.chave}</p>
                        <p className="text-xs text-muted-foreground">{issue.resumo}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {issue.storyPoints} SP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cronograma da Sprint */}
        {selectedIssues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cronograma da Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <GanttChart
                issues={selectedIssues}
                sprintStart={sprintStart}
                sprintEnd={sprintEnd}
                onIssueUpdate={handleIssueUpdate}
                onIssueRemove={(chave) => handleIssueSelect(
                  selectedIssues.find(i => i.chave === chave)!,
                  false
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSavePlan}
            disabled={!isDateRangeValid || selectedIssues.length === 0}
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Salvar Plano
          </Button>
        </div>
      </main>

      {/* Issue Selection Modal */}
      <IssueSelectionModal
        open={isModalOpen}
        issues={issues}
        selectedIssues={selectedIssues.map((i) => i.chave)}
        onSelectionChange={handleModalConfirm}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
