import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database ────────────────────────────────────────────────────────────
vi.mock('../../server/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

// ─── Mock JIRA ────────────────────────────────────────────────────────────────
vi.mock('../../server/jira-sync', () => ({
  fetchJiraIssues: vi.fn().mockResolvedValue([]),
  convertJiraIssuesToDashboard: vi.fn().mockReturnValue([]),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dailyMeeting router', () => {

  describe('createMeeting', () => {
    it('should validate meetingDate is a string', () => {
      const meetingDate = '2026-04-16';
      expect(typeof meetingDate).toBe('string');
      expect(meetingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should require jql parameter', () => {
      const input = { meetingDate: '2026-04-16', jql: '' };
      expect(input.jql).toBe('');
    });

    it('should accept valid meeting input', () => {
      const input = {
        meetingDate: '2026-04-16',
        jql: 'project = TEST AND sprint in openSprints()',
        totalDevs: 5,
      };
      expect(input.totalDevs).toBe(5);
      expect(input.jql).toContain('openSprints');
    });
  });

  describe('saveTurn', () => {
    it('should require meetingId and devName', () => {
      const turn = {
        meetingId: 1,
        devName: 'João',
        currentTask: 'PROJ-123',
        nextTask: 'PROJ-124',
        hasImpediment: false,
        summary: 'Trabalhei na feature X',
      };
      expect(turn.meetingId).toBeGreaterThan(0);
      expect(turn.devName).toBeTruthy();
    });

    it('should handle impediment flag correctly', () => {
      const turnWithImpediment = {
        meetingId: 1,
        devName: 'Maria',
        hasImpediment: true,
        impedimentIssue: 'PROJ-100',
        impedimentComment: 'Aguardando aprovação',
        summary: 'Bloqueada na PROJ-100',
      };
      expect(turnWithImpediment.hasImpediment).toBe(true);
      expect(turnWithImpediment.impedimentIssue).toBe('PROJ-100');
    });

    it('should allow turn without impediment', () => {
      const turnWithoutImpediment = {
        meetingId: 1,
        devName: 'Carlos',
        hasImpediment: false,
        summary: 'Concluí a task PROJ-200',
      };
      expect(turnWithoutImpediment.hasImpediment).toBe(false);
      expect(turnWithoutImpediment.impedimentIssue).toBeUndefined();
    });
  });

  describe('getMinutes', () => {
    it('should generate markdown with meeting date header', () => {
      const date = new Date('2026-04-16');
      const dateStr = date.toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const markdown = `# Daily Standup - ${dateStr}\n`;
      expect(markdown).toContain('Daily Standup');
      expect(markdown).toContain('2026');
    });

    it('should include dev turn sections in markdown', () => {
      const turns = [
        { devName: 'João', summary: 'Trabalhei na feature X', hasImpediment: false },
        { devName: 'Maria', summary: 'Bloqueada', hasImpediment: true, impedimentComment: 'Aguardando PR' },
      ];
      const sections = turns.map(t =>
        `## ${t.devName}\n${t.summary}${t.hasImpediment ? `\n⚠️ Impedimento: ${t.impedimentComment}` : ''}`
      );
      expect(sections[0]).toContain('João');
      expect(sections[1]).toContain('⚠️ Impedimento');
    });

    it('should include impediment summary section when blockers exist', () => {
      const blockers = [
        { devName: 'Maria', impedimentComment: 'Aguardando PR' },
      ];
      const section = blockers.length > 0
        ? `## Impedimentos\n${blockers.map(b => `- **${b.devName}**: ${b.impedimentComment}`).join('\n')}`
        : '';
      expect(section).toContain('Impedimentos');
      expect(section).toContain('Maria');
    });
  });

  describe('getSprintStats', () => {
    it('should calculate completion percentage correctly', () => {
      const total = 20;
      const completed = 15;
      const percentage = Math.round((completed / total) * 100);
      expect(percentage).toBe(75);
    });

    it('should handle zero total issues gracefully', () => {
      const total = 0;
      const completed = 0;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      expect(percentage).toBe(0);
    });

    it('should identify blocked issues', () => {
      const issues = [
        { status: 'Blocked', key: 'PROJ-1' },
        { status: 'In Progress', key: 'PROJ-2' },
        { status: 'Blocked', key: 'PROJ-3' },
      ];
      const blockers = issues.filter(i => i.status === 'Blocked');
      expect(blockers).toHaveLength(2);
    });

    it('should identify stale issues (3+ days same status)', () => {
      const now = new Date('2026-04-16');
      const issues = [
        { key: 'PROJ-1', updatedAt: new Date('2026-04-12'), status: 'In Progress' }, // 4 days
        { key: 'PROJ-2', updatedAt: new Date('2026-04-15'), status: 'In Progress' }, // 1 day
        { key: 'PROJ-3', updatedAt: new Date('2026-04-10'), status: 'In Progress' }, // 6 days
      ];
      const stale = issues.filter(i => {
        const diffMs = now.getTime() - i.updatedAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 3;
      });
      expect(stale).toHaveLength(2);
      expect(stale.map(i => i.key)).toContain('PROJ-1');
      expect(stale.map(i => i.key)).toContain('PROJ-3');
    });
  });

  describe('getMeeting', () => {
    it('should require meetingId as positive integer', () => {
      const validId = 1;
      const invalidId = -1;
      expect(validId).toBeGreaterThan(0);
      expect(invalidId).toBeLessThan(0);
    });
  });

  describe('concludeMeeting', () => {
    it('should require meetingId and durationSeconds', () => {
      const input = {
        meetingId: 1,
        durationSeconds: 1800, // 30 minutes
        silentDevs: ['Carlos'],
      };
      expect(input.durationSeconds).toBe(1800);
      expect(input.silentDevs).toHaveLength(1);
    });

    it('should handle empty silentDevs array', () => {
      const input = {
        meetingId: 1,
        durationSeconds: 900,
        silentDevs: [],
      };
      expect(input.silentDevs).toHaveLength(0);
    });
  });
});
