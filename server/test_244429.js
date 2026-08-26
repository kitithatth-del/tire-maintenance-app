const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
const sheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
const data = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: '', raw: true });
const found = data.filter(d => JSON.stringify(d).includes('244429'));
console.log('Count:', found.length);
if (found.length) console.log(found[0]);
