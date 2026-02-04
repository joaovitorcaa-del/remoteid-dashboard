/**
 * Integração com Jira para sincronizar issues de sprints ativas
 */

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    created: string;
    updated: string;
  };
}

interface SyncedIssue {
  chave: string;
  resumo: string;
  status: string;
  responsavel?: string;
  dataInicio: string;
  dataFim: string;
  storyPoints: number;
}

/**
 * Busca issues da sprint ativa no Jira
 */
export async function fetchJiraActiveSprintIssues(): Promise<JiraIssue[]> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!jiraUrl || !jiraEmail || !jiraToken || !projectKey) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  try {
    console.log('[Jira] Iniciando busca de issues...');
    const jql = `sprint in openSprints() AND project = "${projectKey}"`;
    console.log('[Jira] JQL:', jql);
    const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,assignee,created,updated`;
    console.log('[Jira] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Jira] Erro na resposta:', response.status, errorText);
      throw new Error(`Erro ao buscar issues: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Jira] Resposta:', JSON.stringify(data, null, 2));
    if (!data.issues) {
      throw new Error('Nenhuma issue encontrada na resposta');
    }

    console.log(`✓ Sincronizadas ${data.issues.length} issues da sprint ativa do Jira`);
    return data.issues;
  } catch (error) {
    console.error('Erro ao sincronizar com Jira:', error);
    throw error;
  }
}

/**
 * Mapeia status do Jira para o formato do dashboard
 */
export function mapJiraStatusToDashboard(jiraStatus: string): string {
  const statusMap: Record<string, string> = {
    'To Do': 'Ready to Sprint',
    'In Progress': 'Dev to Do',
    'In Review': 'Code Review',
    'Testing': 'Test to Do',
    'Done': 'Done',
    'Backlog': 'Ready to Sprint',
    'Cancelled': 'Cancelled',
    'Canceled': 'Cancelled',
  };

  return statusMap[jiraStatus] || 'Ready to Sprint';
}

/**
 * Converte issues do Jira para o formato do dashboard
 */
export function convertJiraIssuesToDashboard(jiraIssues: JiraIssue[]): SyncedIssue[] {
  return jiraIssues.map(issue => {
    const dataInicio = new Date(issue.fields.created).toISOString().split('T')[0];
    const dataFim = new Date(issue.fields.updated).toISOString().split('T')[0];

    return {
      chave: issue.key,
      resumo: issue.fields.summary,
      status: mapJiraStatusToDashboard(issue.fields.status.name),
      responsavel: issue.fields.assignee?.displayName || 'Não Atribuído',
      dataInicio,
      dataFim,
      storyPoints: 5, // Valor padrão - será atualizado quando encontrar o campo correto
    };
  });
}
