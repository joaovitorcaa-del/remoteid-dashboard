const SHEET_ID = '1EMe-TgcDeKT586VkKfaYndXmqDAqEWQAV743MWIGF5c';
const SHEET_NAME = 'Página 1';

async function test() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    console.log('Headers:', headers);
    
    const statusIndex = headers.indexOf('Status');
    console.log('\nStatus está no índice:', statusIndex);
    
    // Extrair status únicos
    const statuses = new Set();
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Parse CSV simples
      const parts = lines[i].split(',').map(p => p.replace(/"/g, ''));
      if (parts.length > statusIndex && parts[statusIndex]) {
        statuses.add(parts[statusIndex]);
      }
    }
    
    console.log('\n\nStatus únicos encontrados:');
    Array.from(statuses).sort().forEach(s => console.log(`  "${s}"`));
  } catch (error) {
    console.error('Erro:', error);
  }
}

test();
