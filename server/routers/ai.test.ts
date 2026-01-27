import { describe, it, expect, vi } from 'vitest';
import { aiRouter } from './ai';

// Mock do invokeLLM
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: 'Análise de IA simulada: O projeto está em bom progresso com 62.4% de conclusão.',
        },
      },
    ],
  }),
}));

describe('AI Router', () => {
  it('should generate insight with valid dashboard data', async () => {
    const caller = aiRouter.createCaller({});

    const dashboardData = {
      completionRate: 62.4,
      totalIssues: 125,
      doneIssues: 78,
      inProgressIssues: 47,
      canceledIssues: 0,
      qaGargaloCount: 25,
      devAndCodeReviewCount: 6,
      backlogCount: 15,
      impedimentsCount: 3,
      projectHealth: 'yellow',
    };

    const result = await caller.generateInsight(dashboardData);

    expect(result.success).toBe(true);
    expect(result.insight).toBeDefined();
    expect(result.insight).toContain('progresso');
  });

  it('should handle missing data gracefully', async () => {
    const caller = aiRouter.createCaller({});

    const dashboardData = {
      completionRate: 0,
      totalIssues: 0,
      doneIssues: 0,
      inProgressIssues: 0,
      canceledIssues: 0,
      qaGargaloCount: 0,
      devAndCodeReviewCount: 0,
      backlogCount: 0,
      impedimentsCount: 0,
      projectHealth: 'red',
    };

    const result = await caller.generateInsight(dashboardData);

    expect(result.success).toBe(true);
    expect(result.insight).toBeDefined();
  });
});
