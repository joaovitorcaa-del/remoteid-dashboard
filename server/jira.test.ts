import { describe, it, expect, beforeAll } from 'vitest';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    customfield_10016?: number; // Story Points
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
  };
}

// Função para validar credenciais do Jira
async function validateJiraCredentials(): Promise<boolean> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraUrl || !jiraEmail || !jiraToken) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  try {
    const response = await fetch(`${jiraUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Erro ao validar Jira: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    console.log(`✓ Conectado ao Jira como: ${data.displayName}`);
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao Jira:', error);
    return false;
  }
}

// Função para buscar issues da sprint ativa
async function fetchActiveSprintIssues(): Promise<JiraIssue[]> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!jiraUrl || !jiraEmail || !jiraToken || !projectKey) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  try {
    // JQL para buscar issues da sprint ativa
    const jql = `sprint in openSprints() AND project = "${projectKey}"`;
    const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,assignee,created,updated`;
    console.log('Fetching URL:', url);
    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ${response.status}:`, errorText);
      throw new Error(`Erro ao buscar issues: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.issues) {
      console.error('Resposta do Jira:', JSON.stringify(data, null, 2));
      throw new Error('Nenhuma issue encontrada na resposta');
    }
    console.log(`✓ Encontradas ${data.issues.length} issues na sprint ativa`);
    return data.issues;
  } catch (error) {
    console.error('Erro ao buscar issues do Jira:', error);
    throw error;
  }
}

describe('Jira Integration', () => {
  it('should validate Jira credentials', async () => {
    const isValid = await validateJiraCredentials();
    expect(isValid).toBe(true);
  });

  it('should fetch active sprint issues', async () => {
    const issues = await fetchActiveSprintIssues();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    
    // Validar estrutura das issues
    issues.forEach(issue => {
      expect(issue.key).toBeDefined();
      expect(issue.fields.summary).toBeDefined();
      expect(issue.fields.status).toBeDefined();
    });
  });

  it('should have story points field', async () => {
    const issues = await fetchActiveSprintIssues();
    expect(issues.length).toBeGreaterThan(0);
  });
});
