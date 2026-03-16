import { Bug, TrendingDown, Target } from 'lucide-react';

interface QualityMetricsCardProps {
  totalBugs: number;
  bugsFixed: number;
  bugsDeferred: number;
  testCoverage?: number | null;
  defectDensity?: number | null;
}

export function QualityMetricsCard({
  totalBugs,
  bugsFixed,
  bugsDeferred,
  testCoverage = 0,
  defectDensity = 0,
}: QualityMetricsCardProps) {
  const fixRate = totalBugs > 0 ? Math.round((bugsFixed / totalBugs) * 100) : 0;
  const deferralRate = totalBugs > 0 ? Math.round((bugsDeferred / totalBugs) * 100) : 0;

  const getQualityStatus = () => {
    if (fixRate >= 80) return { status: 'Excelente', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (fixRate >= 60) return { status: 'Bom', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (fixRate >= 40) return { status: 'Aceitável', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'Crítico', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const qualityStatus = getQualityStatus();

  return (
    <div className={`rounded-lg border border-border p-6 ${qualityStatus.bgColor}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Métricas de Qualidade</h3>
          <p className="text-sm text-muted-foreground mt-1">Análise de bugs e cobertura de testes</p>
        </div>
        <div className={`p-3 rounded-lg bg-white ${qualityStatus.color}`}>
          <Bug className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Bugs */}
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total de Bugs</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalBugs}</span>
            <span className="text-xs text-muted-foreground">bugs</span>
          </div>
        </div>

        {/* Fix Rate */}
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Taxa de Correção</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${qualityStatus.color}`}>{fixRate}%</span>
            <span className="text-xs text-muted-foreground">corrigidos</span>
          </div>
        </div>

        {/* Bugs Fixed */}
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Bugs Corrigidos</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">{bugsFixed}</span>
            <span className="text-xs text-muted-foreground">resolvidos</span>
          </div>
        </div>

        {/* Bugs Deferred */}
        <div className="bg-white rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Bugs Adiados</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-yellow-600">{bugsDeferred}</span>
            <span className="text-xs text-muted-foreground">{deferralRate}%</span>
          </div>
        </div>
      </div>

      {/* Quality Status */}
      <div className="bg-white rounded-lg p-4 border border-border mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Status de Qualidade</p>
            <p className={`text-lg font-semibold ${qualityStatus.color}`}>{qualityStatus.status}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Cobertura de Testes</p>
            <p className="text-lg font-semibold text-foreground">{testCoverage}%</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg p-4 border border-border">
        <p className="text-sm text-muted-foreground mb-3">Progresso de Correção</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              fixRate >= 80 ? 'bg-green-600' : fixRate >= 60 ? 'bg-blue-600' : fixRate >= 40 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${fixRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0%</span>
          <span>{fixRate}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Defect Density */}
      {(defectDensity || 0) > 0 && (
        <div className="bg-white rounded-lg p-4 border border-border mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Densidade de Defeitos</p>
            </div>
            <p className="text-lg font-semibold text-foreground">{defectDensity} bugs/1K linhas</p>
          </div>
        </div>
      )}
    </div>
  );
}
