import { useState, useCallback } from 'react';
// Nota: API de IA para próximos passos pode ser integrada no futuro
// Por enquanto, usamos análise local dos dados do dashboard

export interface NextStep {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface DashboardData {
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
}

export function useNextSteps() {
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(false);

  const generateNextSteps = useCallback((dashboardData: DashboardData) => {
    try {
      // Gerar passos padrão baseado em análise dos dados do dashboard
      setSteps(generateDefaultSteps(dashboardData));
    } catch (error) {
      console.error('Erro ao gerar próximos passos:', error);
      setSteps(generateDefaultSteps(dashboardData));
    }
  }, []);

  return { steps, loading, generateNextSteps };
}

function generateDefaultSteps(data: DashboardData): NextStep[] {
  const steps: NextStep[] = [];
  let id = 1;

  // Passo 1: Resolver impedimentos
  if (data.impedimentsCount > 0) {
    steps.push({
      id: id++,
      title: `Desbloquear ${data.impedimentsCount} Impedimento(s) Crítico(s)`,
      description: `Prioridade máxima: Resolver os ${data.impedimentsCount} impedimento(s) que estão bloqueando o avanço do projeto. Alocar recursos dedicados.`,
      priority: 'high',
      icon: 'AlertCircle',
    });
  }

  // Passo 2: Acelerar QA se houver gargalo
  if (data.qaGargaloCount > 20) {
    steps.push({
      id: id++,
      title: `Aumentar Capacidade de QA (${data.qaGargaloCount} itens)`,
      description: `Gargalo detectado em testes. Considerar adicionar recursos ou paralelizar testes para acelerar validação.`,
      priority: 'high',
      icon: 'Zap',
    });
  }

  // Passo 3: Iniciar itens do backlog
  if (data.backlogCount > 0 && data.devAndCodeReviewCount < 10) {
    steps.push({
      id: id++,
      title: `Iniciar ${data.backlogCount} Itens do Backlog`,
      description: `Há capacidade disponível. Começar a trabalhar nos ${data.backlogCount} itens prontos para iniciar (Ready to Sprint).`,
      priority: 'high',
      icon: 'Target',
    });
  }

  // Passo 4: Revisar taxa de conclusão
  if (data.completionRate < 50) {
    steps.push({
      id: id++,
      title: 'Revisar Plano de Entrega',
      description: `Taxa de conclusão em ${data.completionRate}%. Avaliar se cronograma está realista e ajustar se necessário.`,
      priority: 'high',
      icon: 'TrendingUp',
    });
  } else if (data.completionRate < 75) {
    steps.push({
      id: id++,
      title: 'Manter Ritmo de Conclusão',
      description: `Projeto em ${data.completionRate}%. Manter velocidade atual e monitorar próximos marcos.`,
      priority: 'medium',
      icon: 'Clock',
    });
  }

  // Passo 5: Comunicação e status
  steps.push({
    id: id++,
    title: 'Comunicar Status aos Stakeholders',
    description: `Atualizar stakeholders com progresso atual (${data.completionRate}% concluído) e riscos identificados.`,
    priority: 'medium',
    icon: 'Users',
  });

  return steps.slice(0, 5);
}
