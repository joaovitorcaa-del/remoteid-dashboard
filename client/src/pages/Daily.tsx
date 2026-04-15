import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import {
  ArrowLeft, RefreshCw, Share2, Play, Square, ChevronLeft, ChevronRight,
  Flag, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2,
  User, MessageSquare, Zap
} from 'lucide-react';
import { useLocation } from 'wouter';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

type DailyMode = 'view' | 'active' | 'concluded';

interface DevTurn {
  devName: string;
  devId: string;
  currentTask: string;
  currentTaskComment: string;
  nextTask: string;
  nextTaskComment: string;
  hasImpediment: boolean;
  impedimentIssue: string;
  impedimentComment: string;
  summary: string;
  registered: boolean;
  issues: Array<{ key: string; title: string; status: string; lastUpdate: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDaysStuck(issue: any): number {
  const updated = new Date(issue.fields?.updated || issue.lastUpdate || Date.now());
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / 86400000);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DevTurnCard({
  turn,
  isActive,
  onChange,
  onRegister,
}: {
  turn: DevTurn;
  isActive: boolean;
  onChange: (field: keyof DevTurn, value: any) => void;
  onRegister: () => void;
}) {
  if (turn.registered) {
    // Read-only registered card
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            {turn.devName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-green-900">{turn.devName}</p>
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Registrado
            </p>
          </div>
          {turn.hasImpediment && (
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
              <Flag className="w-3 h-3" /> Impedimento
            </span>
          )}
        </div>

        {/* Issues com chaves */}
        {turn.issues.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-green-800 mb-1 uppercase tracking-wide">Issues</p>
            <div className="flex flex-wrap gap-1">
              {turn.issues.map(i => (
                <span key={i.key} className="text-xs bg-white border border-green-200 text-green-800 px-2 py-0.5 rounded font-mono">
                  {i.key}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm">
          {turn.currentTask && (
            <div>
              <span className="text-xs text-green-700 font-semibold">Task Atual:</span>
              <p className="text-green-900">{turn.currentTask}</p>
              {turn.currentTaskComment && <p className="text-xs text-green-700 italic">{turn.currentTaskComment}</p>}
            </div>
          )}
          {turn.nextTask && (
            <div>
              <span className="text-xs text-green-700 font-semibold">Próxima Task:</span>
              <p className="text-green-900">{turn.nextTask}</p>
              {turn.nextTaskComment && <p className="text-xs text-green-700 italic">{turn.nextTaskComment}</p>}
            </div>
          )}
          {turn.hasImpediment && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <span className="text-xs text-red-700 font-semibold">⚠️ Impedimento:</span>
              <p className="text-red-900 text-xs">{turn.impedimentIssue}</p>
              {turn.impedimentComment && <p className="text-xs text-red-700 italic">{turn.impedimentComment}</p>}
            </div>
          )}
          {turn.summary && (
            <div>
              <span className="text-xs text-green-700 font-semibold">Resumo:</span>
              <p className="text-green-900 text-xs">{turn.summary}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isActive) {
    // Pending card - just name
    return (
      <div className="bg-muted/40 border border-border rounded-xl p-4 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center font-bold text-sm">
            {turn.devName.substring(0, 2).toUpperCase()}
          </div>
          <p className="font-medium text-muted-foreground">{turn.devName}</p>
          <Clock className="w-4 h-4 ml-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Active editable card
  return (
    <div className="bg-card border-2 border-primary rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {turn.devName.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg">{turn.devName}</p>
          <p className="text-xs text-primary flex items-center gap-1">
            <Zap className="w-3 h-3" /> Turno ativo
          </p>
        </div>
      </div>

      {/* Issues com chaves */}
      {turn.issues.length > 0 && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Issues do Sprint</p>
          <div className="flex flex-wrap gap-1">
            {turn.issues.map(i => (
              <span key={i.key} title={i.title} className="text-xs bg-background border border-border text-foreground px-2 py-0.5 rounded font-mono cursor-default">
                {i.key} <span className="text-muted-foreground">({i.status})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Task Atual */}
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-blue-500" /> Task Atual
          </label>
          <input
            type="text"
            value={turn.currentTask}
            onChange={e => onChange('currentTask', e.target.value)}
            placeholder="Ex: PROJ-123 - Implementar autenticação"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={turn.currentTaskComment}
            onChange={e => onChange('currentTaskComment', e.target.value)}
            placeholder="Comentário sobre a task atual..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Próxima Task */}
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-semibold flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-green-500" /> Próxima Task
          </label>
          <input
            type="text"
            value={turn.nextTask}
            onChange={e => onChange('nextTask', e.target.value)}
            placeholder="Ex: PROJ-124 - Revisar PR de login"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={turn.nextTaskComment}
            onChange={e => onChange('nextTaskComment', e.target.value)}
            placeholder="Comentário sobre a próxima task..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Impedimento */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={turn.hasImpediment}
              onChange={e => onChange('hasImpediment', e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm font-semibold flex items-center gap-1">
              <Flag className="w-4 h-4 text-red-500" /> Sinalizar Impedimento
            </span>
          </label>
          {turn.hasImpediment && (
            <div className="space-y-2 pl-6 border-l-2 border-red-300">
              <input
                type="text"
                value={turn.impedimentIssue}
                onChange={e => onChange('impedimentIssue', e.target.value)}
                placeholder="Issue impedida (ex: PROJ-100)"
                className="w-full px-3 py-2 border border-red-200 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <textarea
                value={turn.impedimentComment}
                onChange={e => onChange('impedimentComment', e.target.value)}
                placeholder="Descreva o impedimento..."
                rows={2}
                className="w-full px-3 py-2 border border-red-200 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-1">
            <MessageSquare className="w-4 h-4 text-purple-500" /> Resumo
          </label>
          <textarea
            value={turn.summary}
            onChange={e => onChange('summary', e.target.value)}
            placeholder="Consolidação dos comentários do turno..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <Button onClick={onRegister} className="w-full" size="lg">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Registrar Daily
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Daily() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Daily mode state
  const [dailyMode, setDailyMode] = useState<DailyMode>('view');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeDevIndex, setActiveDevIndex] = useState<number | null>(null);
  const [devTurns, setDevTurns] = useState<DevTurn[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [silentDevs, setSilentDevs] = useState<string[]>([]);
  const [showSilentDevs, setShowSilentDevs] = useState(false);

  // Format date
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch active JQL filter
  const { data: activeJqlFilter } = trpc.jqlFilters.getActive.useQuery();

  // Fetch daily data (same as Dashboard)
  const { data: dailyData, isLoading, refetch } = trpc.daily.getDailyData.useQuery(
    { date: dateString, jql: activeJqlFilter?.jql },
    { enabled: !!activeJqlFilter?.jql }
  );

  // Mutations
  const generateReportMutation = trpc.daily.generateDailyReport.useMutation();

  // ── Timer ──
  useEffect(() => {
    if (dailyMode === 'active') {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dailyMode]);

  // ── Initialize dev turns when daily starts ──
  const handleStartDaily = useCallback(() => {
    if (!dailyData?.developers) return;
    const turns: DevTurn[] = dailyData.developers.map((dev: any) => ({
      devId: dev.id,
      devName: dev.name,
      currentTask: '',
      currentTaskComment: '',
      nextTask: '',
      nextTaskComment: '',
      hasImpediment: false,
      impedimentIssue: '',
      impedimentComment: '',
      summary: '',
      registered: false,
      issues: dev.issues || [],
    }));
    setDevTurns(turns);
    setActiveDevIndex(0);
    setTimerSeconds(0);
    setDailyMode('active');
    setAiReport(null);
  }, [dailyData]);

  // ── Update a field in a dev turn ──
  const handleTurnChange = useCallback((devIndex: number, field: keyof DevTurn, value: any) => {
    setDevTurns(prev => prev.map((t, i) => i === devIndex ? { ...t, [field]: value } : t));
  }, []);

  // ── Register dev turn ──
  const handleRegisterTurn = useCallback((devIndex: number) => {
    setDevTurns(prev => prev.map((t, i) => i === devIndex ? { ...t, registered: true } : t));
    // Move to next unregistered dev
    const nextIdx = devTurns.findIndex((t, i) => i > devIndex && !t.registered);
    setActiveDevIndex(nextIdx >= 0 ? nextIdx : null);
  }, [devTurns]);

  // ── Select a dev from the list ──
  const handleSelectDev = useCallback((devIndex: number) => {
    if (devTurns[devIndex]?.registered) return;
    setActiveDevIndex(devIndex);
  }, [devTurns]);

  // ── Conclude daily ──
  const handleConcludeDaily = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Identify devs who didn't speak
    const silent = devTurns.filter(d => !d.registered).map(d => d.devName);
    setSilentDevs(silent);

    setDailyMode('concluded');
    setIsGeneratingReport(true);

    try {
      const result = await generateReportMutation.mutateAsync({
        devTurns: devTurns.filter(d => d.registered),
        metrics: dailyData?.metrics ?? null,
        criticalIssues: dailyData?.criticalIssues ?? [],
        issues: dailyData?.issues ?? [],
      });
      setAiReport(typeof result?.report === 'string' ? result.report : null);
    } catch (err) {
      console.error('Error generating report:', err);
      setAiReport('Não foi possível gerar o resumo automático.');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [devTurns, dailyData, generateReportMutation]);

  // ── Date navigation ──
  const handleDateChange = (days: number) => {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refetch(); } finally { setTimeout(() => setIsRefreshing(false), 1000); }
  };

  // ── Derived data ──
  const issues: any[] = dailyData?.issues ?? [];
  const metrics = dailyData?.metrics;
  const criticalIssues: any[] = dailyData?.criticalIssues ?? [];

  // Issues updated in last 24h
  const recentIssues = issues.filter(issue => {
    const updated = new Date(issue.fields?.updated || 0);
    return (Date.now() - updated.getTime()) < 86400000;
  });

  // Blocked issues
  const blockedIssues = issues.filter(issue =>
    issue.fields?.flagged === true ||
    (issue.fields?.labels || []).includes('blocked') ||
    issue.fields?.status?.name?.toLowerCase().includes('blocked')
  );

  // Stale issues (>3 days in same status)
  const staleIssues = issues.filter(issue => {
    const days = getDaysStuck(issue);
    return days >= 3 && issue.fields?.status?.name !== 'Done' && issue.fields?.status?.name !== 'Cancelled';
  });

  // ── Guard: no JQL ──
  if (!activeJqlFilter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Nenhum Filtro JQL Configurado</h2>
          <p className="text-muted-foreground mb-4">Configure um filtro JQL na Configuração para usar o Daily Dashboard.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados do Daily...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <div className={`border-b sticky top-0 z-20 transition-colors ${dailyMode === 'active' ? 'bg-primary text-primary-foreground' : dailyMode === 'concluded' ? 'bg-green-700 text-white' : 'bg-card'}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className={dailyMode !== 'view' ? 'text-white hover:bg-white/20' : ''}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Daily Dashboard</h1>
                {dailyMode === 'active' && (
                  <p className="text-sm opacity-80">Daily em andamento</p>
                )}
                {dailyMode === 'concluded' && (
                  <p className="text-sm opacity-80">Daily concluída</p>
                )}
                {dailyMode === 'view' && (
                  <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
                )}
              </div>
            </div>

            {/* Timer (only in active mode) */}
            {dailyMode === 'active' && (
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg font-bold">{formatTimer(timerSeconds)}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {dailyMode === 'view' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button size="sm" onClick={handleStartDaily} disabled={!dailyData?.developers?.length}>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Daily
                  </Button>
                </>
              )}
              {dailyMode === 'active' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleConcludeDaily}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Concluir Daily
                </Button>
              )}
              {dailyMode === 'concluded' && (
                <Button size="sm" variant="secondary" onClick={() => { setDailyMode('view'); setTimerSeconds(0); setDevTurns([]); setAiReport(null); }} className="bg-white text-green-700 hover:bg-white/90">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Nova Daily
                </Button>
              )}
            </div>
          </div>

          {/* Date Navigation (view mode only) */}
          {dailyMode === 'view' && (
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => handleDateChange(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center capitalize">{formattedDate}</span>
              <Button variant="ghost" size="sm" onClick={() => handleDateChange(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── ACTIVE MODE: Dev list + active card ── */}
      {dailyMode === 'active' && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Developer list */}
            <div className="lg:col-span-1">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Desenvolvedores
              </h2>
              <div className="space-y-2">
                {devTurns.map((turn, idx) => (
                  <button
                    key={turn.devId}
                    onClick={() => handleSelectDev(idx)}
                    disabled={turn.registered}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      turn.registered
                        ? 'bg-green-50 border-green-200 text-green-800 cursor-default'
                        : activeDevIndex === idx
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-card border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        turn.registered ? 'bg-green-600 text-white' :
                        activeDevIndex === idx ? 'bg-white text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {turn.devName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{turn.devName}</span>
                      {turn.registered && <CheckCircle2 className="w-4 h-4 ml-auto text-green-600" />}
                      {!turn.registered && activeDevIndex === idx && <Zap className="w-4 h-4 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <p>{devTurns.filter(d => d.registered).length} de {devTurns.length} registrados</p>
              </div>
            </div>

            {/* Right: Active card */}
            <div className="lg:col-span-2">
              {activeDevIndex !== null && devTurns[activeDevIndex] && !devTurns[activeDevIndex].registered ? (
                <DevTurnCard
                  turn={devTurns[activeDevIndex]}
                  isActive={true}
                  onChange={(field, value) => handleTurnChange(activeDevIndex, field, value)}
                  onRegister={() => handleRegisterTurn(activeDevIndex)}
                />
              ) : (
                <div className="bg-muted/20 border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Selecione um desenvolvedor para iniciar o turno</p>
                </div>
              )}

              {/* Registered cards below */}
              {devTurns.filter(d => d.registered).length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Turnos Registrados</h3>
                  {devTurns.filter(d => d.registered).map(turn => (
                    <DevTurnCard
                      key={turn.devId}
                      turn={turn}
                      isActive={false}
                      onChange={() => {}}
                      onRegister={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONCLUDED MODE ── */}
      {dailyMode === 'concluded' && (
        <div className="container mx-auto px-4 py-6 space-y-6">

          {/* Summary header */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Daily Concluída
              </h2>
              <span className="text-sm text-green-700 font-mono bg-white px-3 py-1 rounded-full border border-green-200">
                ⏱ {formatTimer(timerSeconds)}
              </span>
            </div>
            <p className="text-sm text-green-700">
              {devTurns.filter(d => d.registered).length} desenvolvedor(es) com fala registrada
              {silentDevs.length > 0 && ` · ${silentDevs.length} sem fala`}
            </p>
          </div>

          {/* Registered dev cards */}
          {devTurns.filter(d => d.registered).length > 0 && (
            <div>
              <h2 className="text-base font-bold mb-3">Turnos Registrados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devTurns.filter(d => d.registered).map(turn => (
                  <DevTurnCard key={turn.devId} turn={turn} isActive={false} onChange={() => {}} onRegister={() => {}} />
                ))}
              </div>
            </div>
          )}

          {/* Silent devs (collapsible) */}
          {silentDevs.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSilentDevs(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Desenvolvedores sem fala ({silentDevs.length})
                </span>
                {showSilentDevs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSilentDevs && (
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {silentDevs.map(name => (
                    <span key={name} className="text-sm bg-muted px-3 py-1 rounded-full text-muted-foreground">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comparison metrics */}
          {metrics && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="text-base font-bold mb-4">Comparação: Hoje vs Ontem</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Taxa de Conclusão', val: metrics.completionRate, unit: '%', lowerIsBetter: false },
                  { label: 'Mudanças', val: metrics.changes, unit: '', lowerIsBetter: false },
                  { label: 'Issues Atrasadas', val: metrics.overdue, unit: '', lowerIsBetter: true },
                  { label: 'Bloqueadores', val: metrics.blockers, unit: '', lowerIsBetter: true },
                ].map(({ label, val, unit, lowerIsBetter }) => {
                  const positive = lowerIsBetter ? val.delta <= 0 : val.delta >= 0;
                  return (
                    <div key={label} className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-bold">{val.today}{unit}</p>
                      <p className={`text-xs font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                        {val.delta >= 0 ? '↑' : '↓'} {Math.abs(val.delta)}{unit} vs ontem
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Executive Summary */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
            <h2 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" /> Resumo Executivo IA
            </h2>
            {isGeneratingReport ? (
              <div className="flex items-center gap-3 text-indigo-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Gerando análise preditiva...</span>
              </div>
            ) : aiReport ? (
              <div className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">{aiReport}</div>
            ) : (
              <p className="text-sm text-indigo-700">Resumo não disponível.</p>
            )}
          </div>

          {/* Recent activity (last 24h) */}
          {recentIssues.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Atividades nas Últimas 24h ({recentIssues.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentIssues.map((issue: any) => (
                  <div key={issue.key} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg text-sm">
                    <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                    <span className="truncate flex-1">{issue.fields?.summary}</span>
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted px-2 py-0.5 rounded">{issue.fields?.status?.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{issue.fields?.assignee?.displayName?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked issues */}
          {blockedIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Itens Impedidos ({blockedIssues.length})
              </h2>
              <div className="space-y-2">
                {blockedIssues.map((issue: any) => (
                  <div key={issue.key} className="flex items-center gap-3 p-2 bg-white border border-red-100 rounded-lg text-sm">
                    <span className="font-mono text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                    <span className="truncate flex-1">{issue.fields?.summary}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{issue.fields?.assignee?.displayName?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stale issues (>3 days same status) */}
          {staleIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Itens Parados há +3 dias ({staleIssues.length})
              </h2>
              <div className="space-y-2">
                {staleIssues.map((issue: any) => {
                  const days = getDaysStuck(issue);
                  return (
                    <div key={issue.key} className="flex items-center gap-3 p-2 bg-white border border-amber-100 rounded-lg text-sm">
                      <span className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                      <span className="truncate flex-1">{issue.fields?.summary}</span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded shrink-0">{issue.fields?.status?.name}</span>
                      <span className="text-xs text-red-600 font-bold shrink-0">{days}d</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {dailyMode === 'view' && (
        <div className="container mx-auto px-4 py-6 space-y-6">

          {/* Comparison metrics */}
          {metrics && (
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-xl p-6 border">
              <h2 className="text-base font-bold mb-5">Comparação: Hoje vs Ontem</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Taxa de Conclusão', val: metrics.completionRate, unit: '%', lowerIsBetter: false },
                  { label: 'Mudanças Registradas', val: metrics.changes, unit: '', lowerIsBetter: false },
                  { label: 'Issues Atrasadas', val: metrics.overdue, unit: '', lowerIsBetter: true },
                  { label: 'Bloqueadores Ativos', val: metrics.blockers, unit: '', lowerIsBetter: true },
                ].map(({ label, val, unit, lowerIsBetter }) => {
                  const positive = lowerIsBetter ? val.delta <= 0 : val.delta >= 0;
                  return (
                    <div key={label} className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground tracking-wider">{label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl line-through text-gray-400">{val.yesterday}{unit}</span>
                        <span className="text-sm">→</span>
                        <span className={`text-3xl font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                          {val.today}{unit}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                        {val.delta >= 0 ? '↑' : '↓'} {Math.abs(val.delta)}{unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Issues Críticas ({criticalIssues.length})
              </h2>
              <div className="space-y-2">
                {criticalIssues.map((issue: any) => (
                  <div key={issue.key} className="flex items-start justify-between bg-white p-3 rounded border border-red-100">
                    <div>
                      <p className="font-semibold text-sm">{issue.key}: {issue.title}</p>
                      <p className="text-xs text-muted-foreground">{issue.status} · {issue.assignee}</p>
                    </div>
                    {issue.daysOverdue > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full shrink-0">
                        {issue.daysOverdue}d atrasado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Developers Grid */}
          {dailyData?.developers && dailyData.developers.length > 0 && (
            <div>
              <h2 className="text-base font-bold mb-4">Atividade do Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyData.developers.map((dev: any) => (
                  <div key={dev.id} className={`p-4 rounded-xl border ${
                    dev.status === 'active' ? 'bg-green-50 border-green-200' :
                    dev.status === 'critical' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{dev.name}</p>
                        <p className="text-xs text-muted-foreground">{dev.lastActivity}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        dev.status === 'active' ? 'bg-green-200 text-green-800' :
                        dev.status === 'critical' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {dev.status === 'active' ? '🟢 Ativo' : dev.status === 'critical' ? '🔴 Crítico' : '⚫ Inativo'}
                      </span>
                    </div>
                    {/* Issue keys */}
                    {dev.issues && dev.issues.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {dev.issues.map((i: any) => (
                          <span key={i.key} title={i.title} className="text-xs font-mono bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                            {i.key}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-sm space-y-1">
                      <p>Hoje: {dev.summary.today.inProgress} em progresso, {dev.summary.today.done} concluídas</p>
                      <p className="text-xs text-muted-foreground">Ontem: {dev.summary.yesterday.inProgress} em progresso, {dev.summary.yesterday.done} concluídas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked issues */}
          {blockedIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Itens Impedidos ({blockedIssues.length})
              </h2>
              <div className="space-y-2">
                {blockedIssues.map((issue: any) => (
                  <div key={issue.key} className="flex items-center gap-3 p-2 bg-white border border-red-100 rounded-lg text-sm">
                    <span className="font-mono text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                    <span className="truncate flex-1">{issue.fields?.summary}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{issue.fields?.assignee?.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stale issues */}
          {staleIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Itens Parados há +3 dias ({staleIssues.length})
              </h2>
              <div className="space-y-2">
                {staleIssues.map((issue: any) => {
                  const days = getDaysStuck(issue);
                  return (
                    <div key={issue.key} className="flex items-center gap-3 p-2 bg-white border border-amber-100 rounded-lg text-sm">
                      <span className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                      <span className="truncate flex-1">{issue.fields?.summary}</span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded shrink-0">{issue.fields?.status?.name}</span>
                      <span className="text-xs text-red-600 font-bold shrink-0">{days}d</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recentIssues.length > 0 && (
            <div className="bg-card border rounded-xl p-5">
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Atividades nas Últimas 24h ({recentIssues.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentIssues.map((issue: any) => (
                  <div key={issue.key} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg text-sm">
                    <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded shrink-0">{issue.key}</span>
                    <span className="truncate flex-1">{issue.fields?.summary}</span>
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted px-2 py-0.5 rounded">{issue.fields?.status?.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{issue.fields?.assignee?.displayName?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
