const SHEET_ID = '1EMe-TgcDeKT586VkKfaYndXmqDAqEWQAV743MWIGF5c';
const SHEET_NAME = 'Página 1';

async function test() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    console.log('Header:', lines[0]);
    console.log('\nPrimeiras 10 linhas:');
    for (let i = 1; i < Math.min(11, lines.length); i++) {
      console.log(lines[i]);
    }
    
    // Extrair status únicos
    const statuses = new Set();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length > 3) {
        statuses.add(parts[3]); // Status é a 4ª coluna
      }
    }
    
    console.log('\n\nStatus únicos encontrados:');
    Array.from(statuses).sort().forEach(s => console.log(`  "${s}"`));
  } catch (error) {
    console.error('Erro:', error);
  }
}

test();
