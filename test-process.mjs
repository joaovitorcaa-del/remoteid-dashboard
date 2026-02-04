const SHEET_ID = '1EMe-TgcDeKT586VkKfaYndXmqDAqEWQAV743MWIGF5c';
const SHEET_NAME = 'Página 1';

async function test() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log('Headers:', headers);
    
    const readyToSprintStatuses = ['Ready to Sprint', 'Dev To Do'];
    const devStatuses = ['CODE DOING', 'CODE REVIEW'];
    
    let readyToSprintCount = 0;
    let devAndCodeReviewCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      const status = row['Status'] || 'Unknown';
      
      if (readyToSprintStatuses.includes(status)) {
        readyToSprintCount++;
        console.log(`Ready to Sprint encontrado: ${row['Key']} - ${status}`);
      }
      
      if (devStatuses.includes(status)) {
        devAndCodeReviewCount++;
        console.log(`Dev/Code Review encontrado: ${row['Key']} - ${status}`);
      }
    }
    
    console.log('\n\nResumo:');
    console.log('readyToSprintCount:', readyToSprintCount);
    console.log('devAndCodeReviewCount:', devAndCodeReviewCount);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

test();
