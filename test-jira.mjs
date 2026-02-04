import fetch from 'node-fetch';

const jiraUrl = 'https://csgnddnp.atlassian.net/';
const jiraEmail = 'joao.alves@invillia.com';
const jiraToken = 'ATATT3xFfGF0uNvALpq_N1uq7HLmGk0gIBZqELBX6dbR4vinkv7r4Jg3sSkPLl7BaS98d0PU5TYfbribwc5UOGocrODYLM7Mgg5g_TfCBT4DwdKNP3nUlvFiCurernmkfLWmFZveHUe3ADW-L5IWD4q0vc7VpUuQ-KxUV7Cqf_gAaWZHEluDkqg=1AD1E238';
const projectKey = 'REM';

const jql = `sprint in openSprints() AND project = "${projectKey}"`;
const baseUrl = jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,assignee,created,updated`;

console.log('URL:', url);

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
    'Accept': 'application/json',
  },
});

if (!response.ok) {
  const errorText = await response.text();
  console.error('Erro:', response.status, errorText);
  process.exit(1);
}

const data = await response.json();
console.log(`\nTotal de issues: ${data.issues.length}\n`);

// Extrair status únicos
const statuses = new Set();
data.issues.forEach(issue => {
  statuses.add(issue.fields.status.name);
  console.log(`${issue.key}: ${issue.fields.status.name}`);
});

console.log('\n\nStatus únicos encontrados:');
Array.from(statuses).forEach(status => console.log(`  - ${status}`));
