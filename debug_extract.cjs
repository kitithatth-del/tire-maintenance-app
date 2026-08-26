const xlsx = require('xlsx');
const fs = require('fs');

const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
const workbook = xlsx.readFile(excelFile);

const metadata = {}; // { [truckNo]: { gpsStatus, gpsLocation, truckStatus, plate } }
const plateToTruck = {}; // { [plate]: truckNo }

// 1. Parse 'Data รถ'
const dataSheet = workbook.Sheets['Data รถ'];
if (dataSheet) {
  const rawRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1, raw: true, defval: null });
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    if (rawRows[i] && rawRows[i].some(c => c && String(c).trim() === 'เบอร์รถ')) {
      headerIdx = i; break;
    }
  }
  if (headerIdx !== -1) {
    const headers = rawRows[headerIdx];
    const getIdx = (name) => headers.findIndex(c => c && String(c).trim() === name);
    
    const truckNoIdx = getIdx('เบอร์รถ');
    const plateIdx = getIdx('ทะเบียนรถ');
    const statusIdx = getIdx('สถานะรถ');
    console.log(`Indices: truckNo=${truckNoIdx}, plate=${plateIdx}, status=${statusIdx}`);
    
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !row[truckNoIdx]) continue;
      const truckNo = String(row[truckNoIdx]).trim();
      const normKey = truckNo.replace(/[^0-9]/g, ''); // Extract only digits for mapping
      const plate = row[plateIdx] ? String(row[plateIdx]).trim() : null;
      const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
      
      if (!metadata[truckNo]) metadata[truckNo] = {};
      if (normKey && normKey !== truckNo) metadata[normKey] = metadata[truckNo]; // Reference same object
      
      metadata[truckNo].truckStatus = status;
      if (plate) {
        metadata[truckNo].plate = plate;
        plateToTruck[plate.replace(/[^0-9]/g, '')] = truckNo;
        plateToTruck[plate] = truckNo;
      }
    }
  }
}

console.log('Metadata for 54:', metadata['54']);
console.log('Metadata for N54:', metadata['N54']);

