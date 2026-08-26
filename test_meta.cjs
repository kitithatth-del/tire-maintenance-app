const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
try {
  const wb = xlsx.readFile(excelFile);
  
  const gpsSheet = wb.Sheets['GPS สถานที่ปัจจุบัน'];
  if (gpsSheet) {
    const rawRows = xlsx.utils.sheet_to_json(gpsSheet, { header: 1 });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => String(c).trim() === 'ทะเบียนรถ')) {
        headerIdx = i; break;
      }
    }
    console.log('GPS Header Idx:', headerIdx);
    if (headerIdx !== -1) {
      console.log('GPS Headers:', rawRows[headerIdx].map(c => `'${c}'`));
    }
  }

  const dataSheet = wb.Sheets['Data รถ'];
  if (dataSheet) {
    const rawRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1 });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => String(c).trim() === 'เบอร์รถ')) {
        headerIdx = i; break;
      }
    }
    console.log('Data รถ Header Idx:', headerIdx);
    if (headerIdx !== -1) {
      console.log('Data รถ Headers:', rawRows[headerIdx].map(c => `'${c}'`));
    }
  }
} catch(e) {
  console.log('Error:', e);
}
