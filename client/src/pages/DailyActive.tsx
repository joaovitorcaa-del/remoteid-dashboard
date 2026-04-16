import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, Clock, AlertTriangle, Flag, ChevronLeft, ChevronRight,
  Loader2, User, AlertCircle, SkipForward, Trophy
} from 'lucide-react';
import { toast } from 'sonner';

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

  const utils = trpc.useUtils();

  // Mutations
  const saveTurnMutation = trpc.dailyMeeting.saveTurn.useMutation();
  const concludeMutation = trpc.dailyMeeting.concludeMeeting.useMutation({
    onSuccess: () => {
      navigate(`/daily-summary/${meetingId}`);
    },
    onError: (err) => {
      toast.error(`Erro ao concluir: ${err.message}`);
    },
  });

  // Build developers list from metrics data - extract unique assignees from issues
  useEffect(() => {
    if (metricsData?.issues && developers.length === 0) {
      const seen = new Set<string>();
      const devs: Developer[] = [];
      for (const issue of metricsData.issues as any[]) {
        const name = issue.responsavel || issue.assignee || '';
        if (name && !seen.has(name)) {
          seen.add(name);
          devs.push({
            name,
            jiraUsername: name,
            status: devs.length === 0 ? 'current' : 'pending',
            turnOrder: devs.length,
          });
        }
      }
      setDevelopers(devs);
    }
  }, [metricsData, developers.length]);

  // Timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalSeconds(prev => prev + 1);
      setDevSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch JIRA issues when dev changes
  useEffect(() => {
    const dev = developers[currentDevIndex];
    if (!dev || !dev.jiraUsername) return;

    setIsLoadingIssues(true);
    utils.dailyMeeting.getIssuesByAssignee.fetch({ jiraUsername: dev.jiraUsername })
      .then((result) => {
        const issueKeys = (result.issues || []).map((i: any) => i.key);
        setForm(prev => ({ ...prev, issues: issueKeys }));
        if (result.error) {
          toast.warning('Não foi possível carregar issues do JIRA. Continuando sem dados.');
        }
      })
      .catch(() => {
        toast.warning('Erro ao buscar issues. Continuando sem dados do JIRA.');
      })
      .finally(() => setIsLoadingIssues(false));
  }, [currentDevIndex, developers]);

  const handleSaveAndNext = async () => {
    // Validate
    if (!form.summary.trim()) {
      toast.error('Por favor, preencha o resumo da daily');
      return;
    }
    if (form.hasBlockers && !form.blockersDescription.trim()) {
      toast.error('Por favor, descreva o impedimento');
      return;
    }
    const hasAnyStatus = form.completedTasks || form.hasWorkInProgress || form.willStartNewTask || form.hasBlockers;
    if (!hasAnyStatus) {
      toast.error('Selecione ao menos um status');
      return;
    }

    setIsSaving(true);
    const dev = developers[currentDevIndex];
    const finishedAt = new Date();

    try {
      await saveTurnMutation.mutateAsync({
        meetingId,
        devName: dev.name,
        devId: dev.jiraUsername,
        jiraUsername: dev.jiraUsername,
        turnOrder: currentDevIndex,
        startedAt: turnStartTime.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationSeconds: devSeconds,
        issues: form.issues,
        completedTasks: form.completedTasks,
        hasWorkInProgress: form.hasWorkInProgress,
        willStartNewTask: form.willStartNewTask,
        hasBlockers: form.hasBlockers,
        summary: form.summary,
        blockersDescription: form.blockersDescription,
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
    setDevSeconds(0);
    setTurnStartTime(new Date());
    toast.info(`${dev.name} pulado`);
  };

  const handleConclude = async () => {
    if (!window.confirm('Concluir a daily? Esta ação não pode ser desfeita.')) return;
    concludeMutation.mutate({ meetingId, durationSeconds: totalSeconds });
  };

  const isLastDev = currentDevIndex >= developers.length;
  const currentDev = developers[currentDevIndex];
  const completedCount = developers.filter(d => d.status === 'completed').length;

  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Carregando daily...</p>
          <p className="text-gray-400 text-sm mt-1">Buscando dados do sprint e do JIRA</p>
        </div>
      </div>
    );
  }

  if (meetingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Ops! Algo deu errado</h3>
          <p className="text-gray-500 text-sm mb-4">{meetingError.message}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetchMeeting()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/daily-entrance')}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-mono text-xl font-bold">{formatTimer(totalSeconds)}</span>
            <span className="text-blue-200 text-sm">total</span>
          </div>
          <div className="text-blue-200 text-sm">|</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg">{formatTimer(devSeconds)}</span>
            <span className="text-blue-200 text-sm">dev atual</span>
          </div>
          {developers.length > 0 && (
            <>
              <div className="text-blue-200 text-sm">|</div>
              <span className="text-blue-100 text-sm">
                {completedCount}/{developers.length} devs
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {developers.length > 0 && totalSeconds > 0 && completedCount > 0 && (
            <span className="text-blue-200 text-xs">
              Média: {Math.round(totalSeconds / completedCount / 60 * 10) / 10} min/dev
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-blue-400 text-white hover:bg-blue-600 gap-2"
            onClick={handleConclude}
            disabled={concludeMutation.isPending}
          >
            {concludeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trophy className="w-4 h-4" />
            )}
            Concluir Daily
          </Button>
        </div>
      </div>

      {/* Split-screen body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL - Board Context (40%) */}
        <div className="w-2/5 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4">

          {/* Sprint Progress Mini */}
          {sprintStats && (
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Sprint</span>
                  <span className="text-sm font-bold text-blue-600">{sprintStats.completion_percentage}%</span>
                </div>
                <Progress value={sprintStats.completion_percentage} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>✅ {sprintStats.completed}</span>
                  <span>🔄 {sprintStats.in_progress}</span>
                  <span>📋 {sprintStats.todo}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockers */}
          {sprintStats?.blockers && sprintStats.blockers.length > 0 && (
            <Card className="border-red-200 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Bloqueios ({sprintStats.blockers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {sprintStats.blockers.slice(0, 5).map((b: any) => (
                  <div key={b.key} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-red-700">{b.key}</span>
                    <span className="text-red-500">{b.days_blocked}d</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Daily Queue */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold text-gray-700">Fila Daily</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1">
              {developers.length === 0 ? (
                <p className="text-xs text-gray-400">Carregando desenvolvedores...</p>
              ) : (
                developers.map((dev, i) => (
                  <div
                    key={dev.name}
                    className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
                      dev.status === 'current'
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : dev.status === 'completed'
                        ? 'text-green-700'
                        : dev.status === 'skipped'
                        ? 'text-gray-400 line-through'
                        : 'text-gray-600'
                    }`}
                  >
                    {dev.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />}
                    {dev.status === 'current' && <span className="text-blue-600">→</span>}
                    {dev.status === 'pending' && <span className="text-gray-300">•</span>}
                    {dev.status === 'skipped' && <SkipForward className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">{dev.name}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Mini Kanban */}
          {sprintStats && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-gray-700">Kanban</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="font-bold text-gray-700 text-lg">{sprintStats.todo}</p>
                    <p className="text-gray-500">TODO</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="font-bold text-blue-700 text-lg">{sprintStats.in_progress}</p>
                    <p className="text-blue-500">DOING</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="font-bold text-green-700 text-lg">{sprintStats.completed}</p>
                    <p className="text-green-500">DONE</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT PANEL - Daily Flow (60%) */}
        <div className="w-3/5 overflow-y-auto p-5 space-y-4">

          {isLastDev ? (
            /* All devs done */
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Todos os turnos registrados!</h2>
              <p className="text-gray-500 mb-6">
                {completedCount} de {developers.length} desenvolvedores participaram.
              </p>
              <Button
                size="lg"
                onClick={handleConclude}
                disabled={concludeMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {concludeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Concluir Daily
              </Button>
            </div>
          ) : currentDev ? (
            <>
              {/* Current Dev Header */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {currentDev.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-blue-900 text-lg">{currentDev.name}</p>
                  <p className="text-xs text-blue-600">
                    Dev {currentDevIndex + 1} de {developers.length} • {formatTimer(devSeconds)} neste turno
                  </p>
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
                  ) : form.issues.length > 0 ? (
                    <div className="space-y-1">
                      {form.issues.map((key) => (
                        <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          <Badge variant="outline" className="font-mono text-xs">{key}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhuma issue encontrada no JIRA para este dev.</p>
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
                    maxLength={500}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{form.summary.length}/500</p>
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
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-500">Carregando desenvolvedores do sprint...</p>
                <p className="text-xs text-gray-400 mt-2">
                  Os desenvolvedores são carregados a partir do JQL configurado.
                </p>
              </div>
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
                className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="font-medium text-green-800">{turn.devName}</span>
                <span className="text-green-600">({formatTimer(turn.durationSeconds)})</span>
                {turn.hasBlockers && <Flag className="w-3 h-3 text-red-500" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
