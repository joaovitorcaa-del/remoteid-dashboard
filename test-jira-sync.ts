import { fetchJiraActiveSprintIssues, convertJiraIssuesToDashboard } from './server/jira-sync';

async function test() {
  try {
    console.log('Testando conexão com Jira...');
    const issues = await fetchJiraActiveSprintIssues();
    console.log(`\nTotal de issues: ${issues.length}\n`);
    
    const converted = convertJiraIssuesToDashboard(issues);
    console.log('Issues convertidas:');
    converted.forEach(issue => {
      console.log(`  ${issue.chave}: ${issue.status}`);
    });
  } catch (error) {
    console.error('Erro:', error);
  }
}

test();
