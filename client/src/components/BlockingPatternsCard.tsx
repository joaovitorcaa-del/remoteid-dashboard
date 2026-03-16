import { AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface BlockingPattern {
  id: number;
  padraoNome: string;
  descricao?: string | null;
  frequencia: number;
  impactoTotal: number | null;
  ultimaOcorrencia?: string | Date | null;
  status: 'Ativo' | 'Resolvido' | 'Monitorando';
}

interface BlockingPatternsCardProps {
  patterns: BlockingPattern[];
}

const statusColors: Record<BlockingPattern['status'], { bg: string; text: string; icon: React.ReactNode }> = {
  'Ativo': {
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  'Monitorando': {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  'Resolvido': {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export function BlockingPatternsCard({ patterns }: BlockingPatternsCardProps) {
  const totalImpact = patterns.reduce((sum, p) => sum + (p.impactoTotal || 0), 0);
  const activePatterns = patterns.filter(p => p.status === 'Ativo').length;
  const resolvedPatterns = patterns.filter(p => p.status === 'Resolvido').length;

  const sortedPatterns = [...patterns].sort((a, b) => b.frequencia - a.frequencia);

  return (
    <div className="rounded-lg border border-border p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Padrões de Bloqueadores</h3>
          <p className="text-sm text-muted-foreground mt-1">Análise de padrões recorrentes</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Padrões Ativos</p>
          <p className="text-2xl font-bold text-red-600">{activePatterns}</p>
        </div>
        <div className="bg-muted rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Impacto Total</p>
          <p className="text-2xl font-bold text-foreground">{totalImpact} SP</p>
        </div>
        <div className="bg-muted rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Resolvidos</p>
          <p className="text-2xl font-bold text-green-600">{resolvedPatterns}</p>
        </div>
      </div>

      {/* Patterns List */}
      {patterns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum padrão de bloqueador identificado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPatterns.map((pattern) => {
            const statusInfo = statusColors[pattern.status];
            const percentageOfTotal = totalImpact > 0 ? Math.round(((pattern.impactoTotal || 0) / totalImpact) * 100) : 0;

            return (
              <div
                key={pattern.id}
                className={`rounded-lg p-4 border border-border ${statusInfo.bg}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-white ${statusInfo.text}`}>
                      {statusInfo.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{pattern.padraoNome}</h4>
                      {pattern.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">{pattern.descricao}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.text} bg-white`}>
                    {pattern.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Frequência</p>
                    <p className="font-semibold text-foreground">{pattern.frequencia}x</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Impacto</p>
                    <p className="font-semibold text-foreground">{pattern.impactoTotal || 0} SP ({percentageOfTotal}%)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Última Ocorrência</p>
                    <p className="font-semibold text-foreground">
                      {pattern.ultimaOcorrencia
                        ? new Date(pattern.ultimaOcorrencia).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Impact Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pattern.status === 'Ativo'
                          ? 'bg-red-600'
                          : pattern.status === 'Monitorando'
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${percentageOfTotal}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insights */}
      {patterns.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Insight:</strong> O padrão mais frequente é{' '}
            <strong>{sortedPatterns[0]?.padraoNome}</strong> com{' '}
            <strong>{sortedPatterns[0]?.frequencia} ocorrências</strong> e impacto de{' '}
            <strong>{(sortedPatterns[0]?.impactoTotal || 0)} SP</strong>. Recomenda-se focar na resolução deste padrão.
          </p>
        </div>
      )}
    </div>
  );
}
