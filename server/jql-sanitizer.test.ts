import { describe, it, expect } from 'vitest';
import {
  sanitizeJql,
  validateJql,
  buildAssigneeJql,
  buildStatusJql,
  buildDateRangeJql,
} from './jql-sanitizer';

describe('JQL Sanitizer', () => {
  describe('sanitizeJql', () => {
    it('should remove line breaks and extra spaces', () => {
      const jql = `sprint in openSprints()
        AND project = REMOTEID
        AND status != Done`;
      const result = sanitizeJql(jql);
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\r');
      expect(result).toContain('sprint in openSprints() and project = REMOTEID and status != Done');
    });

    it('should convert AND to lowercase', () => {
      const jql = 'project = REMOTEID AND status = Done';
      const result = sanitizeJql(jql);
      expect(result).toContain('and');
      expect(result).not.toContain('AND');
    });

    it('should convert OR to lowercase', () => {
      const jql = 'status = Done OR status = "In Progress"';
      const result = sanitizeJql(jql);
      expect(result).toContain('or');
      expect(result).not.toContain('OR');
    });

    it('should convert IN to lowercase', () => {
      const jql = 'assignee IN ("John", "Jane")';
      const result = sanitizeJql(jql);
      expect(result).toContain('in');
      expect(result).not.toContain('IN');
    });

    it('should convert ORDER BY to lowercase', () => {
      const jql = 'project = REMOTEID ORDER BY key DESC';
      const result = sanitizeJql(jql);
      expect(result).toContain('order by');
      expect(result).not.toContain('ORDER BY');
    });

    it('should add space after commas in lists', () => {
      const jql = 'assignee in ("John","Jane","Bob")';
      const result = sanitizeJql(jql);
      expect(result).toContain(', ');
    });

    it('should remove trailing AND/OR/NOT', () => {
      const jql = 'project = REMOTEID AND status = Done AND';
      const result = sanitizeJql(jql);
      expect(result).not.toMatch(/and\s*$/i);
    });

    it('should handle empty string', () => {
      const result = sanitizeJql('');
      expect(result).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(sanitizeJql(null as any)).toBe('');
      expect(sanitizeJql(undefined as any)).toBe('');
    });
  });

  describe('validateJql', () => {
    it('should validate correct JQL', () => {
      const result = validateJql('project = REMOTEID');
      expect(result.valid).toBe(true);
    });

    it('should reject empty JQL', () => {
      const result = validateJql('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vazio');
    });

    it('should detect unbalanced parentheses', () => {
      const result = validateJql('project = REMOTEID AND (status = Done');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Parênteses');
    });

    it('should detect trailing operators', () => {
      const result = validateJql('project = REMOTEID AND');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('operador');
    });

    it('should detect unbalanced double quotes', () => {
      const result = validateJql('project = "REMOTEID');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Aspas');
    });

    it('should detect unbalanced single quotes', () => {
      const result = validateJql("status = 'Done");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Aspas');
    });
  });

  describe('buildAssigneeJql', () => {
    it('should build JQL with single assignee', () => {
      const result = buildAssigneeJql('project = REMOTEID', ['John']);
      expect(result).toContain('assignee in');
      expect(result).toContain('"John"');
    });

    it('should build JQL with multiple assignees', () => {
      const result = buildAssigneeJql('project = REMOTEID', ['John', 'Jane', 'Bob']);
      expect(result).toContain('assignee in');
      expect(result).toContain('"John"');
      expect(result).toContain('"Jane"');
      expect(result).toContain('"Bob"');
    });

    it('should handle empty assignee list', () => {
      const result = buildAssigneeJql('project = REMOTEID', []);
      expect(result).toBe('project = REMOTEID');
    });

    it('should escape quotes in assignee names', () => {
      const result = buildAssigneeJql('project = REMOTEID', ['John "The Dev" Doe']);
      expect(result).toContain('John "The Dev" Doe');
    });

    it('should add proper AND operator', () => {
      const result = buildAssigneeJql('project = REMOTEID', ['John']);
      expect(result).toContain('and assignee in');
    });
  });

  describe('buildStatusJql', () => {
    it('should build JQL with single status', () => {
      const result = buildStatusJql('project = REMOTEID', ['Done']);
      expect(result).toContain('status in');
      expect(result).toContain("'Done'");
    });

    it('should build JQL with multiple statuses', () => {
      const result = buildStatusJql('project = REMOTEID', ['Done', 'In Progress', 'To Do']);
      expect(result).toContain('status in');
      expect(result).toContain("'Done'");
      expect(result).toContain("'In Progress'");
      expect(result).toContain("'To Do'");
    });

    it('should handle empty status list', () => {
      const result = buildStatusJql('project = REMOTEID', []);
      expect(result).toBe('project = REMOTEID');
    });

    it('should add proper AND operator', () => {
      const result = buildStatusJql('project = REMOTEID', ['Done']);
      expect(result).toContain('and status in');
    });
  });

  describe('buildDateRangeJql', () => {
    it('should build JQL with date range', () => {
      const result = buildDateRangeJql('project = REMOTEID', '2025-01-01', '2025-12-31');
      expect(result).toContain('updated >=');
      expect(result).toContain('updated <=');
      expect(result).toContain('2025-01-01');
      expect(result).toContain('2025-12-31');
    });

    it('should add proper AND operator', () => {
      const result = buildDateRangeJql('project = REMOTEID', '2025-01-01', '2025-12-31');
      expect(result).toContain('and updated >=');
    });

    it('should handle invalid date format', () => {
      const result = buildDateRangeJql('project = REMOTEID', '01-01-2025', '12-31-2025');
      expect(result).toBe('project = REMOTEID');
    });

    it('should handle missing dates', () => {
      const result = buildDateRangeJql('project = REMOTEID', '', '2025-12-31');
      expect(result).toBe('project = REMOTEID');
    });
  });

  describe('Integration tests', () => {
    it('should handle complex JQL with multiple filters', () => {
      let jql = 'project = REMOTEID';
      jql = buildDateRangeJql(jql, '2025-01-01', '2025-12-31');
      jql = buildAssigneeJql(jql, ['John', 'Jane']);
      jql = buildStatusJql(jql, ['Done', 'In Progress']);

      expect(jql).toContain('project = REMOTEID');
      expect(jql).toContain('updated >=');
      expect(jql).toContain('assignee in');
      expect(jql).toContain('status in');
    });

    it('should sanitize all operators to lowercase', () => {
      const jql = 'PROJECT = REMOTEID AND STATUS IN ("Done", "In Progress") OR ASSIGNEE = "John" ORDER BY KEY DESC';
      const result = sanitizeJql(jql);
      expect(result).not.toContain('AND');
      expect(result).not.toContain('OR');
      expect(result).not.toContain('IN');
      expect(result).not.toContain('ORDER BY');
    });

    it('should validate sanitized JQL', () => {
      const jql = 'project = REMOTEID AND (status = "Done" OR status = "In Progress") ORDER BY key DESC';
      const sanitized = sanitizeJql(jql);
      const validation = validateJql(sanitized);
      expect(validation.valid).toBe(true);
    });
  });
});
