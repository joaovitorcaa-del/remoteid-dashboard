import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Teste de validação de conexão com Jira
 * Valida se as credenciais fornecidas funcionam corretamente
 */
describe('Jira Connection Validation', () => {
  let jiraUrl: string;
  let jiraEmail: string;
  let jiraToken: string;

  beforeAll(() => {
    jiraUrl = process.env.JIRA_URL || '';
    jiraEmail = process.env.JIRA_EMAIL || '';
    jiraToken = process.env.JIRA_API_TOKEN || '';

    console.log('[Test] JIRA_URL:', jiraUrl ? '✓ Configurado' : '✗ Não configurado');
    console.log('[Test] JIRA_EMAIL:', jiraEmail ? '✓ Configurado' : '✗ Não configurado');
    console.log('[Test] JIRA_API_TOKEN:', jiraToken ? '✓ Configurado' : '✗ Não configurado');
  });

  it('should have Jira credentials configured', () => {
    expect(jiraUrl).toBeTruthy();
    expect(jiraEmail).toBeTruthy();
    expect(jiraToken).toBeTruthy();
  });

  it('should validate Jira URL format', () => {
    expect(jiraUrl).toMatch(/^https:\/\/.+\.atlassian\.net$/);
  });

  it('should validate Jira email format', () => {
    expect(jiraEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should validate Jira token format', () => {
    expect(jiraToken).toBeTruthy();
    expect(jiraToken.length).toBeGreaterThan(50);
  });

  it('should authenticate with Jira API', async () => {
    try {
      const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
      const url = `${baseUrl}/rest/api/3/myself`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      console.log('[Test] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Test] Error response:', errorText);
        throw new Error(`Autenticação falhou: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Test] Usuário autenticado:', data.displayName);
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('accountId');
      expect(data).toHaveProperty('displayName');
    } catch (error) {
      console.error('[Test] Erro ao autenticar com Jira:', error);
      throw error;
    }
  });

  it('should fetch projects from Jira', async () => {
    try {
      const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
      const url = `${baseUrl}/rest/api/3/project`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      console.log('[Test] Projects response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Test] Error fetching projects:', errorText);
        throw new Error(`Falha ao buscar projetos: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Test] Projetos encontrados:', data.length);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    } catch (error) {
      console.error('[Test] Erro ao buscar projetos:', error);
      throw error;
    }
  });

  it('should search for issues with JQL', async () => {
    try {
      const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
      const jql = 'project = REMOTEID order by created desc';
      const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=10`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      console.log('[Test] JQL search response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Test] Error searching issues:', errorText);
        throw new Error(`Falha ao buscar issues: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Test] Issues encontradas:', data.total);
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('issues');
      expect(Array.isArray(data.issues)).toBe(true);
    } catch (error) {
      console.error('[Test] Erro ao buscar issues:', error);
      throw error;
    }
  });
});
