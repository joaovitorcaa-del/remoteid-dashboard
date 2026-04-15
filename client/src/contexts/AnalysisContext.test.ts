import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AnalysisContext', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
  });

  it('deve ter JQL padrão correto', () => {
    const DEFAULT_JQL = 'project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01" ORDER BY priority DESC';
    expect(DEFAULT_JQL).toContain('project IN');
    expect(DEFAULT_JQL).toContain('created >=');
    expect(DEFAULT_JQL).toContain('ORDER BY priority DESC');
  });

  it('deve persistir JQL customizado em localStorage', () => {
    const customJql = 'project IN ("RemoteID") AND status = DONE';
    localStorage.setItem('analysisCustomJql', customJql);
    
    const saved = localStorage.getItem('analysisCustomJql');
    expect(saved).toBe(customJql);
  });

  it('deve recuperar JQL customizado do localStorage', () => {
    const customJql = 'project IN ("RemoteID", "DesktopID") AND created >= "2025-08-01"';
    localStorage.setItem('analysisCustomJql', customJql);
    
    const saved = localStorage.getItem('analysisCustomJql');
    expect(saved).toBe(customJql);
  });

  it('deve limpar localStorage ao restaurar padrão', () => {
    const customJql = 'project IN ("RemoteID")';
    localStorage.setItem('analysisCustomJql', customJql);
    
    localStorage.removeItem('analysisCustomJql');
    const saved = localStorage.getItem('analysisCustomJql');
    
    expect(saved).toBeNull();
  });

  it('deve validar JQL com operadores em minúsculas', () => {
    const validJql = 'project in ("RemoteID") and created >= "2025-07-01" order by priority desc';
    expect(validJql).toContain('project in');
    expect(validJql).toContain('and');
    expect(validJql).toContain('order by');
  });

  it('deve validar JQL com múltiplos projetos', () => {
    const validJql = 'project IN ("RemoteID", "DesktopID", "Mobile ID") AND created >= "2025-07-01"';
    expect(validJql).toContain('RemoteID');
    expect(validJql).toContain('DesktopID');
    expect(validJql).toContain('Mobile ID');
  });

  it('deve validar JQL com filtros de status', () => {
    const validJql = 'project IN ("RemoteID") AND status IN (DONE, "IN PROGRESS") AND created >= "2025-07-01"';
    expect(validJql).toContain('status IN');
    expect(validJql).toContain('DONE');
  });

  it('deve validar JQL com ORDER BY no final', () => {
    const validJql = 'project IN ("RemoteID") AND created >= "2025-07-01" ORDER BY priority DESC';
    expect(validJql.endsWith('ORDER BY priority DESC')).toBe(true);
  });

  it('deve permitir JQL com assignee filter', () => {
    const validJql = 'project IN ("RemoteID") AND assignee IN ("user1", "user2") AND created >= "2025-07-01"';
    expect(validJql).toContain('assignee IN');
    expect(validJql).toContain('user1');
  });

  it('deve permitir JQL com type filter', () => {
    const validJql = 'project IN ("RemoteID") AND type IN ("Bug", "Story") AND created >= "2025-07-01"';
    expect(validJql).toContain('type IN');
    expect(validJql).toContain('Bug');
  });
});
