const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
try {
  const wb = xlsx.readFile(excelFile);
  const gpsSheet = wb.Sheets['GPS สถานที่ปัจจุบัน'];
  const rawRowsGps = xlsx.utils.sheet_to_json(gpsSheet, { header: 1 });
  
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRowsGps.length, 5); i++) {
    if (rawRowsGps[i] && rawRowsGps[i].includes('ทะเบียนรถ')) {
      headerIdx = i; break;
    }
  }

  if (headerIdx !== -1) {
    const headers = rawRowsGps[headerIdx];
    const statusIdx = headers.indexOf('สถานะรถ');
    const locIdx = headers.indexOf('สถานที่ปัจจุบัน');
    
    for (let i = headerIdx + 1; i < headerIdx + 5; i++) {
      const row = rawRowsGps[i];
      if (!row) continue;
      const colATruckNo = row[0] ? String(row[0]).trim() : null; // Column A
      const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
      const loc = row[locIdx] ? String(row[locIdx]).trim() : null;
      console.log(`GPS Row ${i}: Col A=${colATruckNo}, Status=${status}, Loc=${loc}`);
    }
  }
} catch(e) {
  console.log('Error:', e);
}
