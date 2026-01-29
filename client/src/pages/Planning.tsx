import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Plus, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { GanttChart } from '@/components/GanttChart';

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

export default function Planning() {
  const [, navigate] = useLocation();
  const [sprintName, setSprintName] = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd, setSprintEnd] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<SelectedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch issues from Planejamento sheet
  const { data: planejamentoIssues, refetch: refetchIssues } = trpc.issues.getPlanejamento.useQuery();

  // Fetch active sprint
  const { data: activeSprint } = trpc.sprints.getActive.useQuery();

  // Fetch all sprints
  const { data: allSprints } = trpc.sprints.list.useQuery();

  // Create sprint mutation
  const createSprintMutation = trpc.sprints.create.useMutation({
    onSuccess: () => {
      toast.success('Sprint criada com sucesso!');
      setSprintName('');
      setSprintStart('');
      setSprintEnd('');
      setSelectedIssues([]);
    },
    onError: (error) => {
      toast.error(`Erro ao criar sprint: ${error.message}`);
    },
  });

  // Save issues mutation
  const saveIssuesMutation = trpc.sprints.saveIssues.useMutation({
    onSuccess: () => {
      toast.success('Plano salvo com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar plano: ${error.message}`);
    },
  });

  useEffect(() => {
    if (planejamentoIssues) {
      setIssues(planejamentoIssues);
      setLoading(false);
    }
  }, [planejamentoIssues]);

  const handleIssueSelect = (issue: Issue, selected: boolean) => {
    if (selected) {
      // Validar se data de início foi preenchida
      if (!sprintStart) {
        toast.error('Preencha a data de início da Sprint primeiro');
        return;
      }
      // Add issue to selected
      const days = storyPointsToDays(issue.storyPoints);
      const endDate = calculateEndDate(sprintStart, days);
      if (!endDate) {
        toast.error('Data de início inválida');
        return;
      }
      const newIssue: SelectedIssue = {
        ...issue,
        dataInicio: sprintStart,
        dataFim: endDate,
        ordem: selectedIssues.length,
      };
      setSelectedIssues([...selectedIssues, newIssue]);
    } else {
      // Remove issue from selected
      setSelectedIssues(selectedIssues.filter((i) => i.chave !== issue.chave));
    }
  };

  const handleIssueUpdate = (chave: string, dataInicio: string, dataFim: string) => {
    setSelectedIssues(
      selectedIssues.map((issue) =>
        issue.chave === chave
          ? { ...issue, dataInicio, dataFim }
          : issue
      )
    );
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await refetchIssues();
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleSavePlan = async () => {
    if (!sprintName || !sprintStart || !sprintEnd) {
      toast.error('Preencha todos os campos da Sprint');
      return;
    }

    if (selectedIssues.length === 0) {
      toast.error('Selecione pelo menos uma issue');
      return;
    }

    try {
      // Create sprint first
      await createSprintMutation.mutateAsync({
        nome: sprintName,
        dataInicio: sprintStart,
        dataFim: sprintEnd,
      });

      // TODO: Get the created sprint ID and save issues
      // For now, we'll just show success
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const isDateRangeValid = sprintStart && sprintEnd && sprintStart <= sprintEnd;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display text-foreground">Planning</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Planejamento de Sprints
              </p>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Active Sprint Display */}
        {activeSprint && (
          <Card className="mb-8 border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300">
                Sprint Ativa: {activeSprint.nome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 dark:text-green-400">
                {activeSprint.dataInicio} a {activeSprint.dataFim}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sprint Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configurar Nova Sprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-w-xs">
              <Label htmlFor="sprint-name" className="text-sm">Nome da Sprint</Label>
              <Input
                id="sprint-name"
                placeholder="Ex: Sprint 1"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <Label htmlFor="sprint-start" className="text-sm">Data de Início</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  value={sprintStart}
                  onChange={(e) => setSprintStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="sprint-end" className="text-sm">Data de Fim</Label>
                <Input
                  id="sprint-end"
                  type="date"
                  value={sprintEnd}
                  onChange={(e) => setSprintEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {!isDateRangeValid && sprintStart && sprintEnd && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Data de fim deve ser maior ou igual à data de início</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issues List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Issues Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando issues...</p>
            ) : issues.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma issue encontrada</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {issues.map((issue) => (
                  <div
                    key={issue.chave}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted"
                  >
                    <Checkbox
                      id={`issue-${issue.chave}`}
                      checked={selectedIssues.some((i) => i.chave === issue.chave)}
                      onCheckedChange={(checked) =>
                        handleIssueSelect(issue, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`issue-${issue.chave}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {issue.chave} - {issue.resumo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {issue.responsavel} • {issue.storyPoints} SP
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        {selectedIssues.length > 0 && sprintStart && sprintEnd && (
          <Card className="mb-8">
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

        {/* Selected Issues Preview */}
        {selectedIssues.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Issues Selecionadas ({selectedIssues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedIssues.map((issue) => (
                  <div
                    key={issue.chave}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted"
                  >
                    <div>
                      <p className="font-medium text-sm">{issue.chave}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.storyPoints} SP • {issue.dataInicio} → {issue.dataFim}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleIssueSelect(issue, false)
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
