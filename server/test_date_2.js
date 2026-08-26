const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
const sheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
const dataRawTrue = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: '', raw: true });
console.log('Sample True row:', JSON.stringify(dataRawTrue[0], null, 2));
