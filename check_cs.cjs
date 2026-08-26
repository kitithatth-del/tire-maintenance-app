const xlsx = require('xlsx');
const fs = require('fs');

const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
const workbook = xlsx.readFile(excelFile);

const dataSheet = workbook.Sheets['Data รถ'];
const rawRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1, raw: true, defval: null });

console.log('Row 0 length:', rawRows[0]?.length);
console.log('Row 1 length:', rawRows[1]?.length);
console.log('Row 2 length:', rawRows[2]?.length);

const csVal0 = rawRows[0]?.[96];
const csVal1 = rawRows[1]?.[96];
const csVal2 = rawRows[2]?.[96];

console.log('Row 0 Col CS:', csVal0);
console.log('Row 1 Col CS:', csVal1);
console.log('Row 2 Col CS:', csVal2);
