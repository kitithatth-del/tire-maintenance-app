const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
try {
  const wb = xlsx.readFile(excelFile);
  
  // 1. Tire Data
  const tireSheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
  if (tireSheet) {
    const rawRows = xlsx.utils.sheet_to_json(tireSheet, { header: 1 });
    console.log('Tire Data เบอร์รถ sample:');
    let idx = -1;
    for (let i=0; i<10; i++) {
      if (rawRows[i] && rawRows[i].includes('เบอร์รถ')) { idx = i; break; }
    }
    if (idx !== -1) {
      const h = rawRows[idx];
      const tIdx = h.indexOf('เบอร์รถ');
      for (let i=idx+1; i<idx+10; i++) {
        console.log(`  Row ${i}:`, rawRows[i][tIdx]);
      }
    }
  }

  // 2. Data รถ
  const dataSheet = wb.Sheets['Data รถ'];
  if (dataSheet) {
    const rawRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1 });
    console.log('\nData รถ เบอร์รถ sample:');
    let idx = -1;
    for (let i=0; i<5; i++) {
      if (rawRows[i] && rawRows[i].includes('เบอร์รถ')) { idx = i; break; }
    }
    if (idx !== -1) {
      const h = rawRows[idx];
      const tIdx = h.indexOf('เบอร์รถ');
      for (let i=idx+1; i<idx+10; i++) {
        if (rawRows[i] && rawRows[i][tIdx]) {
           console.log(`  Row ${i}:`, rawRows[i][tIdx]);
        }
      }
    }
  }
} catch(e) {
  console.log('Error:', e);
}
