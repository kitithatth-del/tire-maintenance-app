const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
console.log('Reading:', excelFile);
try {
  const wb = xlsx.readFile(excelFile, { sheetRows: 5 });
  console.log('Sheets:', wb.SheetNames);
  wb.SheetNames.forEach(name => {
    console.log('--- Sheet:', name, '---');
    console.log(xlsx.utils.sheet_to_json(wb.Sheets[name], {header: 1})[0]);
  });
} catch(e) {
  console.log('Error reading Excel:', e);
}
