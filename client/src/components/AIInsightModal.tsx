import { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const generateInsight = async () => {
    setLoading(true);
    try {
      // Preparar contexto dos dados
      const context = `
        Contexto do Projeto RemoteID:
        - Taxa de Conclusão: ${dashboardData.completionRate}%
        - Total de Issues: ${dashboardData.totalIssues}
        - Issues Concluídas: ${dashboardData.doneIssues}
        - Issues em Progresso: ${dashboardData.inProgressIssues}
        - Issues Canceladas: ${dashboardData.canceledIssues}
        - Etapa QA (Test To Do + Test Doing + STAGING): ${dashboardData.qaGargaloCount}
        - Em Desenvolvimento/Code Review: ${dashboardData.devAndCodeReviewCount}
        - Backlog (Ready to Sprint): ${dashboardData.backlogCount}
        - Impedimentos: ${dashboardData.impedimentsCount}
        - Status do Projeto: ${dashboardData.projectHealth}
      `;

      const prompt = `Atue como gerente de projetos de TI, analise todo o contexto com base nos dados disponíveis e gere um Resumo Executivo do status atual do projeto e também de insights que possam ser obtidos. ${context}`;

      // Simular chamada à API de IA
      // Em produção, isso seria uma chamada real a um serviço de IA
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      }).catch(() => {
        // Se a API não existir, retornar insight simulado
        return null;
      });

      if (response && response.ok) {
        const data = await response.json();
        setInsight(data.insight);
      } else {
        // Insight simulado para demonstração
        setInsight(
          `O projeto RemoteID está em status ${dashboardData.projectHealth === 'red' ? 'CRÍTICO' : dashboardData.projectHealth === 'yellow' ? 'ATENÇÃO' : 'SAUDÁVEL'} com ${dashboardData.completionRate}% de conclusão. ` +
          `Há ${dashboardData.impedimentsCount} impedimentos bloqueando o avanço, sendo o principal foco a resolução destes bloqueadores. ` +
          `A Etapa QA concentra ${dashboardData.qaGargaloCount} issues aguardando testes, representando ${Math.round((dashboardData.qaGargaloCount / dashboardData.totalIssues) * 100)}% do total. ` +
          `Com ${dashboardData.backlogCount} itens no backlog prontos para começar, recomenda-se: (1) Desbloquear os ${dashboardData.impedimentsCount} impedimentos críticos, (2) Aumentar capacidade de QA para acelerar testes, (3) Manter ritmo de desenvolvimento com os itens do backlog. ` +
          `A velocidade atual sugere conclusão em aproximadamente ${Math.ceil((100 - dashboardData.completionRate) / (dashboardData.completionRate / 7))} dias.`
        );
      }
    } catch (error) {
      setInsight('Erro ao gerar insight. Tente novamente.');
      console.error('Erro ao gerar insight:', error);
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
                <p className="text-foreground leading-relaxed text-justify">
                  {insight}
                </p>
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
