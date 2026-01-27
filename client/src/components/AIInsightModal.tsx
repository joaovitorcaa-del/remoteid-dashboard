import { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Streamdown } from 'streamdown';

interface AIInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: {
    completionRate: number;
    totalIssues: number;
    doneIssues: number;
    inProgressIssues: number;
    canceledIssues: number;
    qaGargaloCount: number;
    devAndCodeReviewCount: number;
    backlogCount: number;
    impedimentsCount: number;
    projectHealth: string;
  };
}

export function AIInsightModal({ isOpen, onClose, dashboardData }: AIInsightModalProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string>('');

  const generateInsightMutation = trpc.ai.generateInsight.useMutation();

  const generateInsight = async () => {
    setLoading(true);
    try {
      const result = await generateInsightMutation.mutateAsync(dashboardData);
      const insightText = typeof result.insight === 'string' ? result.insight : JSON.stringify(result.insight);
      setInsight(insightText);
    } catch (error) {
      console.error('Erro ao gerar insight:', error);
      setInsight('Erro ao gerar insight com IA. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-foreground">Insight de IA</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!insight ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-6">
                Clique no botão abaixo para gerar uma análise executiva automática do status do projeto.
              </p>
              <Button
                onClick={generateInsight}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando análise...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Resumo Executivo
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-foreground leading-relaxed text-justify prose prose-sm max-w-none">
                  <Streamdown>{insight}</Streamdown>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={generateInsight}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    'Regenerar Análise'
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
