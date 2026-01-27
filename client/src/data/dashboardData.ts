export interface DashboardMetrics {
  projectHealth: 'red' | 'yellow' | 'green';
  completionRate: number;
  progressLast24h: number;
  progressLast24hTrend?: 'up' | 'down' | 'stable';
  qaGargaloCount: number;
  qaStatuses: string[];
  devAndCodeReviewCount: number;
  backlogCount?: number;
  totalIssues: number;
  doneIssues: number;
  canceledIssues?: number;
  inProgressIssues?: number;
}

export interface CriticalIssue {
  key: string;
  status: string;
  summary: string;
  impact: 'critical' | 'high' | 'medium';
}

export interface StatusDistribution {
  status: string;
  bugs: number;
  improvements: number;
  tests: number;
  total: number;
}

export const dashboardMetrics: DashboardMetrics = {
  projectHealth: 'red',
  completionRate: 62.4,
  progressLast24h: 0,
  qaGargaloCount: 25,
  qaStatuses: ['Test To Do', 'Test Doing', 'STAGING'],
  devAndCodeReviewCount: 6,
  totalIssues: 125,
  doneIssues: 78,
};

export const criticalIssues: CriticalIssue[] = [
  {
    key: 'REM-3537',
    status: 'Test To Do',
    summary: '[MIGRAÇÃO] Não está chamando o HSM pra migrar o certificado, mas está mudando banco.',
    impact: 'critical',
  },
  {
    key: 'REM-3541',
    status: 'CODE DOING',
    summary: '[AUTORIZAR] Conta sem certificado envia autorização',
    impact: 'high',
  },
  {
    key: 'REM-3551',
    status: 'Dev To Do',
    summary: '[Bug] [Emissão] Ao apagar as informações na primeira tela de emissão...',
    impact: 'high',
  },
];

export const statusDistribution: StatusDistribution[] = [
  { status: 'DONE', bugs: 55, improvements: 10, tests: 13, total: 78 },
  { status: 'Test To Do', bugs: 7, improvements: 12, tests: 0, total: 19 },
  { status: 'Canceled', bugs: 6, improvements: 5, tests: 2, total: 13 },
  { status: 'READY TO SPRINT', bugs: 2, improvements: 2, tests: 0, total: 4 },
  { status: 'STAGING', bugs: 3, improvements: 0, tests: 0, total: 3 },
  { status: 'Test Doing', bugs: 3, improvements: 0, tests: 0, total: 3 },
  { status: 'Dev To Do', bugs: 2, improvements: 1, tests: 0, total: 3 },
  { status: 'CODE DOING', bugs: 1, improvements: 0, tests: 0, total: 1 },
  { status: 'OPENED', bugs: 1, improvements: 0, tests: 0, total: 1 },
];

export const nextSteps = [
  'Prioridade Máxima: Resolução do Bloqueador REM-3537. Alocar o recurso técnico mais sênior para investigar e resolver imediatamente o problema de migração de certificados.',
  'Acelerar Testes/QA: O time de QA deve priorizar os 19 itens em "Test To Do", focando em itens que desbloqueiam funcionalidades críticas.',
  'Investigar Estagnação: O Gerente de Projeto deve investigar a causa das 106 Issues Estagnadas e garantir que o backlog reflita o status real do trabalho.',
  'Foco em Conclusão: Garantir que os 3 itens em "Test Doing" sejam finalizados e movidos para "DONE" para restabelecer o fluxo de entregas.',
  'Revisão de Processo: Realizar uma breve reunião de stand-up para alinhar o time sobre a importância da atualização diária das Issues.',
];
