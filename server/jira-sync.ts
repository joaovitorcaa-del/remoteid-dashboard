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
    const jql = `sprint in openSprints() AND project = ${projectKey}`;
    console.log('[Jira] JQL:', jql);
    const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=summary,status,assignee,created,updated`;
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
    'To Do': 'Dev to Do',
    'Backlog': 'Ready to Sprint',
    'Ready to Sprint': 'Ready to Sprint',
    'Dev To Do': 'Dev to Do',
    'In Progress': 'Code Doing',
    'CODE DOING': 'Code Doing',
    'Code Doing': 'Code Doing',
    'In Review': 'Code Review',
    'CODE REVIEW': 'Code Review',
    'Code Review': 'Code Review',
    'Testing': 'Test to Do',
    'TEST TO DO': 'Test to Do',
    'Test to Do': 'Test to Do',
    'TEST DOING': 'Test Doing',
    'Test Doing': 'Test Doing',
    'STAGING': 'Staging',
    'Staging': 'Staging',
    'Done': 'Done',
    'DONE': 'Done',
    'Cancelled': 'Cancelled',
    'Canceled': 'Cancelled',
    'CANCELLED': 'Cancelled',
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


/**
 * Função genérica para buscar issues do Jira usando JQL customizado
 */
export async function fetchJiraIssuesByJql(jql: string): Promise<JiraIssue[]> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraUrl || !jiraEmail || !jiraToken) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  try {
    console.log('[Jira] Buscando issues com JQL customizado...');
    console.log('[Jira] JQL:', jql);
    const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=summary,status,assignee,created,updated,priority,customfield_10016`;
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

    console.log(`✓ Encontradas ${data.issues.length} issues`);
    return data.issues;
  } catch (error) {
    console.error('Erro ao buscar issues do Jira:', error);
    throw error;
  }
}

/**
 * Busca issues do Backlog no Jira usando JQL
 */
export async function fetchJiraBacklogIssues(): Promise<JiraIssue[]> {
  const jiraUrl = process.env.JIRA_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraUrl || !jiraEmail || !jiraToken) {
    throw new Error('Credenciais do Jira não configuradas');
  }

  try {
    console.log('[Jira Backlog] Iniciando busca de issues do backlog...');
    const jql = `SPRINT is EMPTY AND project in ("RemoteID", "DesktopID", "Mobile ID") AND status NOT IN (OPENED, Prioritized, "USER STORY WRITTEN", "USER STORY REFINEMENT", PREPLANNING, DONE, Canceled) AND issuetype NOT IN (EPIC, "Technical Task") ORDER BY priority desc`;
    console.log('[Jira Backlog] JQL:', jql);
    const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=summary,status,assignee,created,updated,priority`;
    console.log('[Jira Backlog] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Jira Backlog] Erro na resposta:', response.status, errorText);
      throw new Error(`Erro ao buscar backlog: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Jira Backlog] Resposta:', JSON.stringify(data, null, 2));
    if (!data.issues) {
      throw new Error('Nenhuma issue encontrada na resposta');
    }

    console.log(`✓ Encontradas ${data.issues.length} issues do backlog`);
    return data.issues;
  } catch (error) {
    console.error('Erro ao buscar backlog do Jira:', error);
    throw error;
  }
}
