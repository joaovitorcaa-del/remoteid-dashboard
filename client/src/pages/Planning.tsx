import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, ArrowLeft, RefreshCw, Edit2, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { GanttChart } from '@/components/GanttChart';
import { IssueSelectionModal } from '@/components/IssueSelectionModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Issue {
  chave: string;
  resumo: string;
  responsavel: string;
  storyPoints: number;
  tipo?: string;
  status?: string;
}

interface SelectedIssue extends Issue {
  dataInicio: string;
  dataFim: string;
  ordem: number;
}

interface Sprint {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim: string;
  ativo: number;
  issues?: SelectedIssue[];
}

const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

const calculateEndDate = (startDate: string, days: number): string => {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return end.toISOString().split('T')[0];
};

const formatDate = (date: string | Date): string => {
  if (!date) return '';
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
  const [savedSprint, setSavedSprint] = useState<Sprint | null>(null);
  const [editingSprintId, setEditingSprintId] = useState<number | null>(null);
  const [selectedHistorySprint, setSelectedHistorySprint] = useState<Sprint | null>(null);

  const { data: planejamentoIssues, refetch: refetchIssues } = trpc.issues.getPlanejamento.useQuery();
  const { data: activeSprint, refetch: refetchActiveSprint } = trpc.sprints.getActive.useQuery();
  const { data: allSprints, refetch: refetchAllSprints } = trpc.sprints.list.useQuery();

  const createSprintMutation = trpc.sprints.create.useMutation({
    onSuccess: () => {
      toast.success('Sprint criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar sprint: ${error.message}`);
    },
  });

  const saveIssuesMutation = trpc.sprints.saveIssues.useMutation({
    onSuccess: () => {
      toast.success('Issues salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar issues:', error);
      toast.error(`Erro ao salvar issues: ${error.message}`);
    },
  });

  const deleteSprintMutation = trpc.sprints.delete.useMutation({
    onSuccess: () => {
      toast.success('Sprint deletada com sucesso!');
      refetchAllSprints();
      setSelectedHistorySprint(null);
    },
    onError: (error) => {
      toast.error(`Erro ao deletar sprint: ${error.message}`);
    },
  });

  const reactivateSprintMutation = trpc.sprints.reactivate.useMutation({
    onSuccess: () => {
      toast.success('Sprint reativada com sucesso!');
      refetchAllSprints();
      refetchActiveSprint();
      setSelectedHistorySprint(null);
    },
    onError: (error) => {
      toast.error(`Erro ao reativar sprint: ${error.message}`);
    },
  });

  useEffect(() => {
    if (planejamentoIssues) {
      setIssues(planejamentoIssues);
      setLoading(false);
    }
  }, [planejamentoIssues]);

  useEffect(() => {
    if (activeSprint) {
      setSavedSprint(activeSprint);
    }
  }, [activeSprint]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await refetchIssues();
    await refetchActiveSprint();
    await refetchAllSprints();
    setIsRefreshing(false);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleIssueSelect = (issue: Issue, selected: boolean) => {
    if (selected) {
      const newIssue: SelectedIssue = {
        ...issue,
        dataInicio: sprintStart,
        dataFim: calculateEndDate(sprintStart, storyPointsToDays(issue.storyPoints)),
        ordem: selectedIssues.length + 1,
      };
      setSelectedIssues([...selectedIssues, newIssue]);
    } else {
      setSelectedIssues(selectedIssues.filter((i) => i.chave !== issue.chave));
    }
  };

  const handleModalConfirm = (selectedChaves: string[]) => {
    const newSelectedIssues: SelectedIssue[] = selectedChaves
      .map((chave) => {
        const issue = issues.find((i) => i.chave === chave);
        if (!issue) return null;
        return {
          ...issue,
          dataInicio: sprintStart,
          dataFim: calculateEndDate(sprintStart, storyPointsToDays(issue.storyPoints)),
          ordem: selectedChaves.indexOf(chave) + 1,
        };
      })
      .filter((issue): issue is SelectedIssue => issue !== null);

    setSelectedIssues(newSelectedIssues);
    setIsModalOpen(false);
  };

  const handleIssueUpdate = (chave: string, updates: Partial<SelectedIssue>) => {
    setSelectedIssues(
      selectedIssues.map((issue) =>
        issue.chave === chave ? { ...issue, ...updates } : issue
      )
    );
  };

  const isDateRangeValid = sprintStart && sprintEnd && new Date(sprintStart) < new Date(sprintEnd);

  const handleSavePlan = async () => {
    if (!sprintName || !sprintStart || !sprintEnd || selectedIssues.length === 0) {
      toast.error('Preencha todos os campos e selecione pelo menos uma issue');
      return;
    }

    try {
      const sprintResponse = await createSprintMutation.mutateAsync({
        nome: sprintName,
        dataInicio: sprintStart,
        dataFim: sprintEnd,
      });

      if (sprintResponse && sprintResponse.id) {
        await saveIssuesMutation.mutateAsync({
          sprintId: sprintResponse.id,
          issues: selectedIssues.map((issue) => ({
            chave: issue.chave,
            resumo: issue.resumo,
            responsavel: issue.responsavel,
            storyPoints: issue.storyPoints,
            dataInicio: issue.dataInicio,
            dataFim: issue.dataFim,
            ordem: issue.ordem,
          })),
        });

        setSprintName('');
        setSprintStart('');
        setSprintEnd('');
        setSelectedIssues([]);

        await refetchActiveSprint();
        await refetchAllSprints();
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
    }
  };

  const handleDeleteSprint = (sprintId: number) => {
    if (confirm('Tem certeza que deseja deletar esta Sprint?')) {
      deleteSprintMutation.mutate({ sprintId });
    }
  };

  const handleReactivateSprint = (sprintId: number) => {
    reactivateSprintMutation.mutate({ sprintId });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planning</h1>
            <p className="text-sm text-muted-foreground">Planejamento de Sprints</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Sprint Ativa Salva - TOPO */}
        {(savedSprint || activeSprint) && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300">
                ✅ {(savedSprint || activeSprint)?.nome}-Ativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400">
                {(savedSprint || activeSprint)?.dataInicio} a {(savedSprint || activeSprint)?.dataFim}
              </p>
              <GanttChart
                issues={(savedSprint || activeSprint)?.issues || []}
                sprintStart={(savedSprint || activeSprint)?.dataInicio || ''}
                sprintEnd={(savedSprint || activeSprint)?.dataFim || ''}
                onIssueUpdate={handleIssueUpdate}
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

            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              className="w-full"
              disabled={!sprintStart || !sprintEnd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Selecionar Issues
            </Button>

            {selectedIssues.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedIssues.length} issue(ns) selecionada(s)
                  </p>
                </CardContent>
              </Card>
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

        {/* Histórico de Sprints - Accordion Expansível */}
        {allSprints && allSprints.filter(s => !s.ativo).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="history">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="text-sm font-semibold">📋 Visualizar Sprints Anteriores</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="sprint-select" className="text-sm font-medium">Selecione uma Sprint anterior:</Label>
                        <select
                          id="sprint-select"
                          onChange={(e) => {
                            const sprintId = parseInt(e.target.value);
                            const sprint = allSprints.find(s => s.id === sprintId);
                            setSelectedHistorySprint(sprint || null);
                          }}
                          value={selectedHistorySprint?.id || ''}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        >
                          <option value="">-- Selecione uma Sprint --</option>
                          {allSprints
                            .filter(s => !s.ativo)
                            .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
                            .map((sprint) => (
                              <option key={sprint.id} value={sprint.id}>
                                {sprint.nome} ({formatDate(sprint.dataInicio)} a {formatDate(sprint.dataFim)})
                              </option>
                            ))}
                        </select>
                      </div>

                      {selectedHistorySprint && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">{selectedHistorySprint.nome}</h4>
                            <p className="text-xs text-muted-foreground mb-4">
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
                          </div>

                          <div className="flex gap-2 border-t pt-4">
                            <button
                              onClick={() => handleReactivateSprint(selectedHistorySprint.id)}
                              className="flex items-center gap-1 px-3 py-2 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reativar Sprint
                            </button>
                            <button
                              onClick={() => handleDeleteSprint(selectedHistorySprint.id)}
                              className="flex items-center gap-1 px-3 py-2 rounded bg-red-600 text-white text-xs hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Deletar Sprint
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
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
