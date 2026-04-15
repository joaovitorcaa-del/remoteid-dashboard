import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Streamdown } from 'streamdown';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: any }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: detail, isLoading } = trpc.dailyHistory.getMeetingDetail.useQuery(
    { meetingId: meeting.id },
    { enabled: open }
  );

  const registeredCount = meeting.registeredDevs ?? 0;
  const totalCount = meeting.totalDevs ?? 0;
  const silentDevs: string[] = Array.isArray(meeting.silentDevs)
    ? meeting.silentDevs
    : (typeof meeting.silentDevs === 'string' ? JSON.parse(meeting.silentDevs || '[]') : []);

  const impedimentTurns = detail?.turns?.filter((t: any) => t.hasImpediment) ?? [];

  return (
    <Card className="border border-border/50 hover:border-border transition-colors">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base font-semibold">
                    {formatDate(meeting.meetingDate)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Daily Meeting
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status */}
                <Badge variant={meeting.status === 'concluded' ? 'default' : 'secondary'}>
                  {meeting.status === 'concluded' ? 'Concluída' : 'Em Progresso'}
                </Badge>

                {/* Duration */}
                {meeting.durationSeconds > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(meeting.durationSeconds)}
                  </div>
                )}

                {/* Participation */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {registeredCount}/{totalCount}
                </div>

                {/* Impediments */}
                {impedimentTurns.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {impedimentTurns.length}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {/* Dev Turns */}
                {detail?.turns && detail.turns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Participações ({detail.turns.filter((t: any) => t.registered).length}/{detail.turns.length})
                    </h4>

                    <div className="grid gap-2">
                      {detail.turns.map((turn: any) => (
                        <div
                          key={turn.id}
                          className={`rounded-lg border p-3 text-sm ${
                            turn.registered
                              ? 'border-border bg-muted/20'
                              : 'border-dashed border-border/50 bg-muted/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {turn.registered ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <span className="font-medium">{turn.devName}</span>
                            </div>
                            {turn.hasImpediment ? (
                              <Badge variant="destructive" className="text-xs">Impedimento</Badge>
                            ) : null}
                          </div>

                          {turn.registered && (
                            <div className="mt-2 pl-6 space-y-1 text-muted-foreground">
                              {turn.currentTask && (
                                <p><span className="text-foreground font-medium">Atual:</span> {turn.currentTask}
                                  {turn.currentTaskComment && <span className="text-xs ml-1 italic">— {turn.currentTaskComment}</span>}
                                </p>
                              )}
                              {turn.nextTask && (
                                <p><span className="text-foreground font-medium">Próxima:</span> {turn.nextTask}
                                  {turn.nextTaskComment && <span className="text-xs ml-1 italic">— {turn.nextTaskComment}</span>}
                                </p>
                              )}
                              {turn.hasImpediment && turn.impedimentIssue && (
                                <p className="text-amber-600">
                                  <span className="font-medium">Impedimento:</span> {turn.impedimentIssue}
                                  {turn.impedimentComment && <span className="text-xs ml-1 italic">— {turn.impedimentComment}</span>}
                                </p>
                              )}
                              {turn.summary && (
                                <p className="text-xs italic border-t border-border/30 pt-1 mt-1">
                                  <MessageSquare className="w-3 h-3 inline mr-1" />
                                  {turn.summary}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Silent devs */}
                {silentDevs.length > 0 && (
                  <div className="rounded-lg border border-dashed border-border/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      <XCircle className="w-4 h-4 inline mr-1 text-muted-foreground" />
                      <span className="font-medium">Sem participação:</span>{' '}
                      {silentDevs.join(', ')}
                    </p>
                  </div>
                )}

                {/* AI Report */}
                {meeting.aiReport && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReport(!showReport)}
                      className="text-xs gap-1"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      {showReport ? 'Ocultar' : 'Ver'} Resumo Executivo IA
                    </Button>
                    {showReport && (
                      <div className="rounded-lg bg-muted/30 border border-border/50 p-4 text-sm">
                        <Streamdown>{meeting.aiReport}</Streamdown>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel() {
  const { data: stats, isLoading } = trpc.dailyHistory.getDevStats.useQuery();
  const { data: impediments, isLoading: loadingImpediments } = trpc.dailyHistory.getImpedimentHistory.useQuery({ limit: 10 });

  return (
    <div className="space-y-4">
      {/* Dev Participation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participação por Desenvolvedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : stats && stats.length > 0 ? (
            <div className="space-y-2">
              {stats.map((s: any) => (
                <div key={s.devName} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{s.devName}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{s.registeredTurns}/{s.totalTurns} dailies</span>
                    {s.impedimentCount > 0 && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {s.impedimentCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma participação registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Impediments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Impedimentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingImpediments ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : impediments && impediments.length > 0 ? (
            <div className="space-y-2">
              {impediments.map((item: any) => (
                <div key={item.id} className="text-sm border-l-2 border-amber-400 pl-3 py-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.devName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.meetingDate)}
                    </span>
                  </div>
                  {item.impedimentIssue && (
                    <p className="text-muted-foreground text-xs mt-0.5">{item.impedimentIssue}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum impedimento registrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailyHistory() {
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: meetings, isLoading } = trpc.dailyHistory.listMeetings.useQuery({
    limit,
    offset: page * limit,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Histórico de Dailies</h1>
          </div>
          <p className="text-muted-foreground">
            Registro histórico de todas as reuniões diárias realizadas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meeting List */}
          <div className="lg:col-span-2 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : meetings && meetings.length > 0 ? (
              <>
                {meetings.map((meeting: any) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!meetings || meetings.length < limit}
                  >
                    Próxima
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma daily registrada</p>
                <p className="text-sm mt-1">
                  As dailies aparecerão aqui após serem concluídas na página Daily.
                </p>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <StatsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
