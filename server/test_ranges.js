const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
console.log('GPS:', xlsx.utils.sheet_to_json(wb.Sheets['GPS สถานที่ปัจจุบัน'], { range: 1, defval: '', raw: true }).slice(0, 1));
console.log('GPS without range:', xlsx.utils.sheet_to_json(wb.Sheets['GPS สถานที่ปัจจุบัน'], { defval: '', raw: true }).slice(0, 1));
console.log('Data รถ:', xlsx.utils.sheet_to_json(wb.Sheets['Data รถ'], { range: 1, defval: '', raw: true }).slice(0, 1));
console.log('Data รถ without range:', xlsx.utils.sheet_to_json(wb.Sheets['Data รถ'], { defval: '', raw: true }).slice(0, 1));
