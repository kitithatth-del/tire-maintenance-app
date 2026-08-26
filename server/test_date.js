const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
const sheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
const dataRawFalse = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: '', raw: false });
const dataRawTrue = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: '', raw: true });
console.log('False (string):', dataRawFalse[0]['วันที่บันทึก']);
console.log('True (serial):', dataRawTrue[0]['วันที่บันทึก']);

function parseExcelSerial(serial) {
  return new Date(1900, 0, Math.floor(Number(serial)) - 1);
}
console.log('Parsed True:', parseExcelSerial(dataRawTrue[0]['วันที่บันทึก']));
