import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Trophy, CheckCircle2, Flag, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Import new components
import { SprintProgressMini } from '@/components/daily-active/SprintProgressMini';
import { DailyQueue } from '@/components/daily-active/DailyQueue';
import { MiniKanban } from '@/components/daily-active/MiniKanban';
import { CurrentDev } from '@/components/daily-active/CurrentDev';
import { IssuesList } from '@/components/daily-active/IssuesList';
import { QuickStatus } from '@/components/daily-active/QuickStatus';
import { SummaryInput } from '@/components/daily-active/SummaryInput';
import { BlockersInput } from '@/components/daily-active/BlockersInput';
import { NavigationButtons } from '@/components/daily-active/NavigationButtons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Developer {
  name: string;
  jiraUsername: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  turnOrder: number;
}

interface TurnForm {
  issues: string[];
  completedTasks: boolean;
  hasWorkInProgress: boolean;
  willStartNewTask: boolean;
  hasBlockers: boolean;
  summary: string;
  blockersDescription: string;
}

interface RegisteredTurn {
  devName: string;
  durationSeconds: number;
  summary: string;
  hasBlockers: boolean;
  issues: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const emptyForm = (): TurnForm => ({
  issues: [],
  completedTasks: false,
  hasWorkInProgress: false,
  willStartNewTask: false,
  hasBlockers: false,
  summary: '',
  blockersDescription: '',
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DailyActive() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = Number(params.meetingId);
  const [, navigate] = useLocation();

  // Meeting data
  const { data: meetingData, isLoading: meetingLoading, error: meetingError, refetch: refetchMeeting } = trpc.dailyMeeting.getMeeting.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // Active JQL for sprint context
  const { data: activeFilter } = trpc.jqlFilters.getActive.useQuery();
  const { data: sprintStats } = trpc.dailyMeeting.getSprintStats.useQuery(
    { jql: activeFilter?.jql ?? '' },
    { enabled: !!activeFilter?.jql }
  );

  // Developers list from JIRA metrics
  const { data: metricsData } = trpc.dashboard.getMetricsByJql.useQuery(
    { jql: activeFilter?.jql ?? '' },
    { enabled: !!activeFilter?.jql }
  );

  // State
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [currentDevIndex, setCurrentDevIndex] = useState(0);
  const [form, setForm] = useState<TurnForm>(emptyForm());
  const [registeredTurns, setRegisteredTurns] = useState<RegisteredTurn[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [devSeconds, setDevSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState<Date>(new Date());
  const [loadedIssues, setLoadedIssues] = useState<Array<{key: string; summary: string; status: string}>>([]);
  const [newIssueInput, setNewIssueInput] = useState('');

  const utils = trpc.useUtils();

  // Mutations
  const saveTurnMutation = trpc.dailyMeeting.saveTurn.useMutation();
  const concludeMutation = trpc.dailyMeeting.concludeMeeting.useMutation({
    onSuccess: () => {
      navigate(`/daily-summary/${meetingId}`);
    },
  });

  // Initialize developers from metrics
  useEffect(() => {
    if (metricsData?.issues && metricsData.issues.length > 0) {
      const uniqueDevs = Array.from(
        new Map(
          metricsData.issues
            .filter((issue: any) => issue.responsavel)
            .map((issue: any) => [
              issue.responsavel,
              {
                name: issue.responsavel,
                jiraUsername: issue.responsavel,
                status: 'pending' as const,
                turnOrder: 0,
              },
            ])
        ).values()
      );
      setDevelopers(uniqueDevs.map((dev, i) => ({ ...dev, turnOrder: i })));
      if (uniqueDevs.length > 0) {
        setDevelopers(prev => prev.map((d, i) => (i === 0 ? { ...d, status: 'current' } : d)));
      }
    }
  }, [metricsData]);

  // Timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalSeconds(prev => prev + 1);
      setDevSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load issues for current dev
  useEffect(() => {
    const dev = developers[currentDevIndex];
    if (!dev || !dev.jiraUsername) return;

    setIsLoadingIssues(true);
    setLoadedIssues([]);
    utils.dailyMeeting.getIssuesByAssignee.fetch({ jiraUsername: dev.jiraUsername })
      .then((result) => {
        const issues = result.issues || [];
        const mapped = issues.map((i: any) => ({ key: i.key, summary: i.summary || '', status: i.status || '' }));
        setLoadedIssues(mapped);
        const issueKeys = mapped.map((i) => i.key);
        setForm(prev => ({ ...prev, issues: issueKeys }));
        if (result.fromCache) {
          toast.info('Usando dados em cache — JIRA pode estar desatualizado');
        }
        if (result.error) {
          toast.warning('Não foi possível carregar issues do JIRA. Continuando sem dados.');
        }
      })
      .catch((err) => {
        console.error('Failed to load issues:', err);
        toast.warning('Erro ao carregar issues do JIRA');
      })
      .finally(() => {
        setIsLoadingIssues(false);
      });
  }, [currentDevIndex, developers, utils]);

  // Handlers
  const handleRegisterTurn = async () => {
    if (!form.summary.trim()) {
      toast.error('Resumo é obrigatório');
      return;
    }

    if (form.hasBlockers && !form.blockersDescription.trim()) {
      toast.error('Descreva o impedimento');
      return;
    }

    setIsSaving(true);
    try {
      const dev = developers[currentDevIndex];
      await saveTurnMutation.mutateAsync({
        meetingId,
        devName: dev.name,
        turnOrder: dev.turnOrder,
        jiraUsername: dev.jiraUsername,
        completedTasks: form.completedTasks,
        hasWorkInProgress: form.hasWorkInProgress,
        willStartNewTask: form.willStartNewTask,
        hasBlockers: form.hasBlockers,
        blockersDescription: form.blockersDescription,
        summary: form.summary,
        issues: form.issues,
      });

      // Add to registered turns
      setRegisteredTurns(prev => [...prev, {
        devName: dev.name,
        durationSeconds: devSeconds,
        summary: form.summary,
        hasBlockers: form.hasBlockers,
        issues: form.issues,
      }]);

      // Update dev status
      setDevelopers(prev => prev.map((d, i) => {
        if (i === currentDevIndex) return { ...d, status: 'completed' };
        if (i === currentDevIndex + 1) return { ...d, status: 'current' };
        return d;
      }));

      // Advance
      const nextIndex = currentDevIndex + 1;
      setCurrentDevIndex(nextIndex);
      setForm(emptyForm());
      setLoadedIssues([]);
      setNewIssueInput('');
      setDevSeconds(0);
      setTurnStartTime(new Date());

      toast.success(`Turno de ${dev.name} registrado!`);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    const dev = developers[currentDevIndex];
    setDevelopers(prev => prev.map((d, i) => {
      if (i === currentDevIndex) return { ...d, status: 'skipped' };
      if (i === currentDevIndex + 1) return { ...d, status: 'current' };
      return d;
    }));
    setCurrentDevIndex(prev => prev + 1);
    setForm(emptyForm());
    setLoadedIssues([]);
    setNewIssueInput('');
    setDevSeconds(0);
    setTurnStartTime(new Date());
    toast.info(`${dev.name} pulado`);
  };

  const handleGoBack = () => {
    if (currentDevIndex === 0) return;
    const prevIndex = currentDevIndex - 1;
    setDevelopers(prev => prev.map((d, i) => {
      if (i === currentDevIndex) return { ...d, status: 'pending' };
      if (i === prevIndex) return { ...d, status: 'current' };
      return d;
    }));
    setCurrentDevIndex(prevIndex);
    setForm(emptyForm());
    setLoadedIssues([]);
    setNewIssueInput('');
    setDevSeconds(0);
    setTurnStartTime(new Date());
    toast.info('Voltou ao desenvolvedor anterior');
  };

  const handleConclude = async () => {
    if (!window.confirm('Concluir a daily? Esta ação não pode ser desfeita.')) return;
    concludeMutation.mutate({ meetingId, durationSeconds: totalSeconds });
  };

  const handlePrevious = () => {
    if (currentDevIndex > 0) {
      setCurrentDevIndex(prev => prev - 1);
      setForm(emptyForm());
      setDevSeconds(0);
    }
  };

  const handleNext = () => {
    handleRegisterTurn();
  };

  const handleFlag = () => {
    setForm(prev => ({ ...prev, hasBlockers: !prev.hasBlockers }));
  };

  const handleSaveAndNext = () => {
    if (currentDevIndex + 1 >= developers.length) {
      handleConclude();
    } else {
      handleRegisterTurn();
    }
  };

  const isLastDev = currentDevIndex >= developers.length;
  const currentDev = developers[currentDevIndex];
  const completedCount = developers.filter(d => d.status === 'completed').length;

  // Loading state
  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando reunião...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (meetingError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Erro ao carregar reunião</p>
          <Button onClick={() => refetchMeeting()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">Daily Meeting</h1>
            <p className="text-sm text-blue-100">Duração total: {formatTimer(totalSeconds)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{completedCount} de {developers.length} devs</p>
              <p className="text-xs text-blue-100">Progresso: {Math.round((completedCount / developers.length) * 100)}%</p>
            </div>
            {isLastDev ? (
              <Button
                onClick={handleConclude}
                disabled={concludeMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {concludeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
                Concluir Daily
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Split-screen body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL - Board Context (40%) */}
        <div className="w-2/5 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4">
          {sprintStats && (
            <SprintProgressMini
              completed={sprintStats.completed}
              total={sprintStats.total_issues}
              percentage={sprintStats.completion_percentage}
            />
          )}
          <DailyQueue developers={developers} currentDevIndex={currentDevIndex} />
          {sprintStats && (
            <MiniKanban
              todo={sprintStats.todo}
              doing={sprintStats.in_progress}
              done={sprintStats.completed}
            />
          )}
        </div>

        {/* RIGHT PANEL - Daily Flow (60%) */}
        <div className="w-3/5 overflow-y-auto p-5 space-y-4">
          {currentDev && !isLastDev ? (
            <>
              {/* Current Dev Header */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-900 text-lg">{currentDev.name}</p>
                    <p className="text-xs text-blue-600">
                      Dev {currentDevIndex + 1} de {developers.length} • {formatTimer(devSeconds)} neste turno
                    </p>
                  </div>
                </div>
              </div>

              {/* JIRA Issues */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">
                    📋 Issues do Sprint
                    {isLoadingIssues && <Loader2 className="w-3 h-3 animate-spin inline ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {isLoadingIssues ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-3/4" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {loadedIssues.length > 0 ? (
                        <div className="space-y-1">
                          {loadedIssues.map((issue) => (
                            <div key={issue.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <Checkbox
                                id={`issue-${issue.key}`}
                                checked={form.issues.includes(issue.key)}
                                onCheckedChange={(checked) =>
                                  setForm(prev => ({
                                    ...prev,
                                    issues: checked
                                      ? [...prev.issues, issue.key]
                                      : prev.issues.filter(k => k !== issue.key)
                                  }))
                                }
                              />
                              <label htmlFor={`issue-${issue.key}`} className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <Badge variant="outline" className="font-mono text-xs shrink-0">{issue.key}</Badge>
                                {issue.summary && (
                                  <span className="text-xs text-gray-500 truncate">{issue.summary}</span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Nenhuma issue encontrada no JIRA para este dev.</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <input
                          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 bg-white"
                          placeholder="Adicionar manualmente (ex: REM-1234) e pressionar Enter"
                          value={newIssueInput}
                          onChange={(e) => setNewIssueInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newIssueInput.trim()) {
                              const key = newIssueInput.trim().toUpperCase();
                              if (!form.issues.includes(key)) {
                                setForm(prev => ({ ...prev, issues: [...prev.issues, key] }));
                                setLoadedIssues(prev =>
                                  prev.some(i => i.key === key) ? prev : [...prev, { key, summary: '', status: '' }]
                                );
                              }
                              setNewIssueInput('');
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Status */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">⚡ Status Rápido</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {[
                    { key: 'completedTasks', label: 'Concluí tarefas' },
                    { key: 'hasWorkInProgress', label: 'Tenho trabalho em progresso' },
                    { key: 'willStartNewTask', label: 'Vou iniciar nova tarefa' },
                    { key: 'hasBlockers', label: 'Tenho impedimento/dependência' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Checkbox
                        id={key}
                        checked={form[key as keyof TurnForm] as boolean}
                        onCheckedChange={(checked) =>
                          setForm(prev => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <label htmlFor={key} className="text-sm text-gray-700 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700">💬 Resumo</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea
                    placeholder="O que fez ontem? O que vai fazer hoje?"
                    value={form.summary}
                    onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))}
                    maxLength={280}
                    rows={3}
                    className="resize-none"
                  />
                  <p className={`text-xs text-right mt-1 ${form.summary.length > 250 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                    {form.summary.length}/280
                  </p>
                </CardContent>
              </Card>

              {/* Blockers (conditional) */}
              {form.hasBlockers && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      🚫 Impedimentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Textarea
                      placeholder="Descreva o impedimento..."
                      value={form.blockersDescription}
                      onChange={(e) => setForm(prev => ({ ...prev, blockersDescription: e.target.value }))}
                      rows={3}
                      className="resize-none border-red-200 focus:border-red-400"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  disabled={currentDevIndex === 0}
                  className="gap-2 text-gray-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="gap-2 text-gray-500"
                >
                  <SkipForward className="w-4 h-4" />
                  Pular
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={handleSaveAndNext}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {currentDevIndex + 1 >= developers.length ? 'Registrar e Concluir' : 'Próximo Dev →'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Carregando desenvolvedores...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Registered Turns */}
      {registeredTurns.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">TURNOS REGISTRADOS</p>
          <div className="flex flex-wrap gap-2">
            {registeredTurns.map((turn, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 max-w-xs"
              >
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="font-medium text-green-800 shrink-0">{turn.devName}</span>
                <span className="text-green-600 shrink-0">({formatTimer(turn.durationSeconds)})</span>
                {turn.hasBlockers && <Flag className="w-3 h-3 text-red-500 shrink-0" />}
                {turn.summary && (
                  <span className="text-green-700 italic truncate">"{turn.summary.substring(0, 50)}{turn.summary.length > 50 ? '...' : ''}"</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
