import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, Clock, AlertTriangle, Flag, Users, TrendingUp,
  FileText, Loader2, ChevronDown, ChevronUp, Copy, History, Home
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Streamdown } from 'streamdown';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DailySummary() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = Number(params.meetingId);
  const [, navigate] = useLocation();
  const [showSilent, setShowSilent] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Fetch meeting data
  const { data: meetingData, isLoading } = trpc.dailyMeeting.getMeeting.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // Fetch minutes (Markdown)
  const { data: minutesData, isLoading: minutesLoading } = trpc.dailyMeeting.getMinutes.useQuery(
    { meetingId },
    { enabled: !!meetingId }
  );

  // Active JQL for sprint context
  const { data: activeFilter } = trpc.jqlFilters.getActive.useQuery();
  const { data: sprintStats } = trpc.dailyMeeting.getSprintStats.useQuery(
    { jql: activeFilter?.jql ?? '' },
    { enabled: !!activeFilter?.jql }
  );

  // AI report generation
  const generateAI = trpc.daily.generateDailyReport.useMutation({
    onSuccess: (data: any) => {
      setAiReport(data.report || data.insight || '');
      setIsGeneratingAI(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao gerar relatório IA: ${err.message}`);
      setIsGeneratingAI(false);
    },
  });

  const handleGenerateAI = () => {
    if (!meetingData) return;
    setIsGeneratingAI(true);

    const turns = meetingData.turns || [];
    const devTurns = turns.map((t: any) => ({
      devName: t.devName,
      summary: t.summary || '',
      hasImpediment: !!(t.hasBlockers || t.hasImpediment),
      impedimentComment: t.blockersDescription || t.impedimentComment || '',
    }));

    generateAI.mutate({
      devTurns,
      metrics: {
        completionRate: { today: sprintStats?.completion_percentage || 0, delta: 0 },
        overdue: { today: sprintStats?.blockers?.length || 0 },
        blockers: { today: sprintStats?.blockers?.length || 0 },
      },
      criticalIssues: sprintStats?.blockers || [],
      issues: [],
    });
  };

  const handleCopyMinutes = () => {
    if (minutesData?.markdown) {
      navigator.clipboard.writeText(minutesData.markdown);
      toast.success('Ata copiada para a área de transferência!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Carregando resumo...</p>
        </div>
      </div>
    );
  }

  if (!meetingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Daily não encontrada.</p>
          <Button onClick={() => navigate('/daily')} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  const { meeting, turns } = meetingData;
  const registeredTurns = (turns || []).filter((t: any) => t.registered || t.summary);
  const blockerTurns = registeredTurns.filter((t: any) => t.hasBlockers || t.hasImpediment);
  const totalDevs = meeting.totalDevs || 0;
  const silentDevs = totalDevs - registeredTurns.length;
  const avgTurnSec = registeredTurns.length > 0
    ? Math.round((meeting.durationSeconds || 0) / registeredTurns.length)
    : 0;

  const dateStr = meeting.meetingDate
    ? format(new Date(meeting.meetingDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Daily Concluída
            </h1>
            <p className="text-sm text-gray-500">{capitalizedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/daily-history')}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Histórico
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/daily')}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Home className="w-4 h-4" />
              Início
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{formatDuration(meeting.durationSeconds || 0)}</p>
              <p className="text-xs text-gray-500">Duração Total</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{registeredTurns.length}</p>
              <p className="text-xs text-gray-500">Participaram</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{blockerTurns.length}</p>
              <p className="text-xs text-gray-500">Impedimentos</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{formatDuration(avgTurnSec)}</p>
              <p className="text-xs text-gray-500">Média/Dev</p>
            </CardContent>
          </Card>
        </div>

        {/* Registered Turns */}
        {registeredTurns.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Turnos Registrados ({registeredTurns.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {registeredTurns.map((turn: any, i: number) => (
                <div key={i} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                        {turn.devName?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <span className="font-semibold text-green-900">{turn.devName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(turn.hasBlockers || turn.hasImpediment) && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <Flag className="w-3 h-3" /> Impedimento
                        </Badge>
                      )}
                      {turn.durationSeconds > 0 && (
                        <span className="text-xs text-green-600">{formatDuration(turn.durationSeconds)}</span>
                      )}
                    </div>
                  </div>
                  {turn.summary && (
                    <p className="text-sm text-green-800 mt-2">{turn.summary}</p>
                  )}
                  {(turn.blockersDescription || turn.impedimentComment) && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>Impedimento:</strong> {turn.blockersDescription || turn.impedimentComment}
                    </div>
                  )}
                  {turn.issues && Array.isArray(turn.issues) && turn.issues.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {turn.issues.map((key: string) => (
                        <Badge key={key} variant="outline" className="font-mono text-xs">{key}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Silent Devs */}
        {silentDevs > 0 && (
          <Card className="border-gray-200">
            <CardHeader className="pb-2">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowSilent(prev => !prev)}
              >
                <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                  <Users className="w-4 h-4" />
                  Não participaram ({silentDevs})
                </CardTitle>
                {showSilent ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
            </CardHeader>
            {showSilent && (
              <CardContent>
                <p className="text-sm text-gray-500">
                  {silentDevs} desenvolvedor(es) não registraram turno nesta daily.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Blockers Summary */}
        {blockerTurns.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <Flag className="w-5 h-5" />
                Impedimentos Registrados ({blockerTurns.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {blockerTurns.map((turn: any, i: number) => (
                <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="font-semibold text-red-800 text-sm">{turn.devName}</p>
                  <p className="text-sm text-red-700 mt-1">
                    {turn.blockersDescription || turn.impedimentComment || 'Impedimento não descrito'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sprint Context */}
        {sprintStats && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Contexto do Sprint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progresso</span>
                <span className="font-bold text-blue-600">{sprintStats.completion_percentage}%</span>
              </div>
              <Progress value={sprintStats.completion_percentage} className="h-2 mb-3" />
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-green-50 rounded p-2">
                  <p className="font-bold text-green-700">{sprintStats.completed}</p>
                  <p className="text-green-600 text-xs">Concluídas</p>
                </div>
                <div className="bg-blue-50 rounded p-2">
                  <p className="font-bold text-blue-700">{sprintStats.in_progress}</p>
                  <p className="text-blue-600 text-xs">Em Progresso</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="font-bold text-gray-700">{sprintStats.todo}</p>
                  <p className="text-gray-600 text-xs">A Fazer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Report */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Resumo Executivo IA
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI}
                className="gap-2"
              >
                {isGeneratingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {aiReport ? 'Regenerar' : 'Gerar Resumo IA'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isGeneratingAI ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : aiReport ? (
              <div className="prose prose-sm max-w-none">
                <Streamdown>{aiReport}</Streamdown>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Clique em "Gerar Resumo IA" para criar um resumo executivo com análise preditiva.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Meeting Minutes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Ata da Daily (Markdown)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyMinutes}
                disabled={!minutesData?.markdown}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {minutesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : minutesData?.markdown ? (
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto border">
                {minutesData.markdown}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ata não disponível.</p>
            )}
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex gap-3 pb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/daily-history')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            Ver Histórico
          </Button>
          <Button
            onClick={() => navigate('/daily')}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
}
