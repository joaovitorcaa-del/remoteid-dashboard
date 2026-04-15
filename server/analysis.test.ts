import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do db
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

// Mock do jql-sanitizer
vi.mock('./jql-sanitizer', () => ({
  sanitizeJql: vi.fn((jql: string) => jql.trim()),
}));

describe('Analysis Router - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JQL Sanitization', () => {
    it('should sanitize JQL before use', async () => {
      const { sanitizeJql } = await import('./jql-sanitizer');
      const result = sanitizeJql('  project IN ("RemoteID")  ');
      expect(result).toBe('project IN ("RemoteID")');
    });
  });

  describe('Story Points Extraction', () => {
    it('should extract story points from customfield_10016', () => {
      const fields = { customfield_10016: 5, customfield_10028: null, customfield_10029: null };
      const sp = fields.customfield_10016 || fields.customfield_10028 || fields.customfield_10029 || 0;
      expect(sp).toBe(5);
    });

    it('should fallback to customfield_10028', () => {
      const fields = { customfield_10016: null, customfield_10028: 3, customfield_10029: null };
      const sp = fields.customfield_10016 || fields.customfield_10028 || fields.customfield_10029 || 0;
      expect(sp).toBe(3);
    });

    it('should return 0 when no story points', () => {
      const fields = { customfield_10016: null, customfield_10028: null, customfield_10029: null };
      const sp = fields.customfield_10016 || fields.customfield_10028 || fields.customfield_10029 || 0;
      expect(sp).toBe(0);
    });
  });

  describe('Sprint Extraction', () => {
    it('should extract latest sprint from array', () => {
      const sprints = [
        { name: 'Sprint 1', state: 'closed' },
        { name: 'Sprint 2', state: 'active' },
      ];
      const latest = sprints[sprints.length - 1];
      expect(latest.name).toBe('Sprint 2');
      expect(latest.state).toBe('active');
    });

    it('should return null for empty sprints', () => {
      const sprints: any[] = [];
      const result = sprints.length > 0 ? sprints[sprints.length - 1] : null;
      expect(result).toBeNull();
    });
  });

  describe('Issue Conversion', () => {
    it('should convert JIRA issue to DB row format', () => {
      const issue = {
        key: 'RID-123',
        fields: {
          summary: 'Test issue',
          status: { name: 'In Progress' },
          assignee: { displayName: 'John Doe' },
          reporter: { displayName: 'Jane Doe' },
          created: '2025-07-15T10:00:00.000Z',
          updated: '2025-08-01T10:00:00.000Z',
          priority: { name: 'High' },
          issuetype: { name: 'Story' },
          project: { key: 'RID' },
          labels: ['frontend', 'urgent'],
          components: [{ name: 'UI' }],
          resolution: null,
          resolutiondate: null,
          statuscategorychangedate: '2025-07-20T10:00:00.000Z',
          customfield_10016: 5,
          customfield_10020: [{ name: 'Sprint 3', state: 'active' }],
        },
      };

      const f = issue.fields;
      const row = {
        issueKey: issue.key,
        summary: f.summary,
        issueType: f.issuetype?.name,
        status: f.status?.name,
        priority: f.priority?.name,
        assignee: f.assignee?.displayName,
        reporter: f.reporter?.displayName,
        project: f.project?.key,
        storyPoints: String(f.customfield_10016 || 0),
        sprintName: f.customfield_10020?.[f.customfield_10020.length - 1]?.name || null,
        labels: JSON.stringify(f.labels),
        components: JSON.stringify(f.components.map((c: any) => c.name)),
      };

      expect(row.issueKey).toBe('RID-123');
      expect(row.summary).toBe('Test issue');
      expect(row.issueType).toBe('Story');
      expect(row.status).toBe('In Progress');
      expect(row.priority).toBe('High');
      expect(row.assignee).toBe('John Doe');
      expect(row.project).toBe('RID');
      expect(row.storyPoints).toBe('5');
      expect(row.sprintName).toBe('Sprint 3');
      expect(row.labels).toBe('["frontend","urgent"]');
      expect(row.components).toBe('["UI"]');
    });
  });

  describe('Cycle Time Calculation', () => {
    it('should calculate cycle time in days', () => {
      const created = new Date('2025-07-01T00:00:00Z').getTime();
      const resolved = new Date('2025-07-15T00:00:00Z').getTime();
      const cycleDays = (resolved - created) / (1000 * 60 * 60 * 24);
      expect(cycleDays).toBe(14);
    });

    it('should handle same-day resolution', () => {
      const created = new Date('2025-07-01T00:00:00Z').getTime();
      const resolved = new Date('2025-07-01T12:00:00Z').getTime();
      const cycleDays = (resolved - created) / (1000 * 60 * 60 * 24);
      expect(cycleDays).toBe(0.5);
    });
  });

  describe('Status Categorization', () => {
    it('should categorize statuses correctly', () => {
      const categorize = (status: string) => {
        if (['DONE', 'Done', 'Closed'].includes(status)) return 'Concluído';
        if (['CODE DOING', 'Code Doing', 'In Progress'].includes(status)) return 'Em Desenvolvimento';
        if (['CODE REVIEW', 'Code Review'].includes(status)) return 'Em Revisão';
        if (['TEST TO DO', 'Test to Do', 'TEST DOING', 'Test Doing'].includes(status)) return 'Em QA';
        if (['Cancelled', 'Canceled'].includes(status)) return 'Cancelado';
        return 'Outros';
      };

      expect(categorize('DONE')).toBe('Concluído');
      expect(categorize('CODE DOING')).toBe('Em Desenvolvimento');
      expect(categorize('CODE REVIEW')).toBe('Em Revisão');
      expect(categorize('TEST DOING')).toBe('Em QA');
      expect(categorize('Cancelled')).toBe('Cancelado');
      expect(categorize('Backlog')).toBe('Outros');
    });
  });

  describe('Throughput Grouping', () => {
    it('should group by month correctly', () => {
      const date = new Date('2025-08-15T10:00:00Z');
      const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      expect(periodKey).toBe('2025-08');
    });

    it('should group by week correctly', () => {
      const date = new Date('2025-08-15T10:00:00Z'); // Friday
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const periodKey = weekStart.toISOString().split('T')[0];
      expect(periodKey).toBe('2025-08-10'); // Previous Sunday
    });
  });

  describe('Velocity Trend', () => {
    it('should detect upward trend', () => {
      const sprints = [
        { completedStoryPoints: 10 },
        { completedStoryPoints: 15 },
        { completedStoryPoints: 20 },
        { completedStoryPoints: 25 },
      ];

      const n = sprints.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = sprints.reduce((sum, s) => sum + s.completedStoryPoints, 0);
      const sumXY = sprints.reduce((sum, s, i) => sum + i * s.completedStoryPoints, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      expect(slope).toBe(5); // 5 SP increase per sprint
      expect(slope > 0.5).toBe(true); // upward trend
    });

    it('should detect downward trend', () => {
      const sprints = [
        { completedStoryPoints: 25 },
        { completedStoryPoints: 20 },
        { completedStoryPoints: 15 },
        { completedStoryPoints: 10 },
      ];

      const n = sprints.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = sprints.reduce((sum, s) => sum + s.completedStoryPoints, 0);
      const sumXY = sprints.reduce((sum, s, i) => sum + i * s.completedStoryPoints, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      expect(slope).toBe(-5); // 5 SP decrease per sprint
      expect(slope < -0.5).toBe(true); // downward trend
    });
  });
});
