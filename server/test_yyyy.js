const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
const sheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
const data = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: '', raw: true });
const badYears = data.filter(d => Number(d.YYYY) > 3000 || Number(d.YYYY) < 2000);
console.log('Count of bad YYYY:', badYears.length);
if(badYears.length > 0) {
  console.log('Sample bad YYYY:', badYears[0].YYYY);
}
