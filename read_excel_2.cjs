const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
try {
  const wb = xlsx.readFile(excelFile, { sheetRows: 5 });
  ['GPS สถานที่ปัจจุบัน', 'Data รถ'].forEach(name => {
    console.log('--- Sheet:', name, '---');
    console.log(xlsx.utils.sheet_to_json(wb.Sheets[name], {header: 1}).slice(0, 3));
  });
} catch(e) {
  console.log('Error reading Excel:', e);
}
