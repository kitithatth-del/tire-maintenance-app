const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
try {
  const wb = xlsx.readFile(excelFile);
  const metadata = {}; // { [truckNo]: { gpsStatus, gpsLocation, truckStatus, plate } }
  const plateToTruck = {}; // { [plate]: truckNo }

  // 1. Parse 'Data รถ'
  const dataSheet = wb.Sheets['Data รถ'];
  if (dataSheet) {
    const rawRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1 });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].includes('เบอร์รถ')) {
        headerIdx = i; break;
      }
    }
    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const truckNoIdx = headers.indexOf('เบอร์รถ');
      const plateIdx = headers.indexOf('ทะเบียนรถ');
      const statusIdx = headers.indexOf('สถานะรถ');
      
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[truckNoIdx]) continue;
        const truckNo = String(row[truckNoIdx]).trim();
        const plate = row[plateIdx] ? String(row[plateIdx]).trim() : null;
        const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
        
        if (!metadata[truckNo]) metadata[truckNo] = {};
        metadata[truckNo].truckStatus = status;
        if (plate) {
          metadata[truckNo].plate = plate;
          plateToTruck[plate.replace(/[^0-9]/g, '')] = truckNo; // mapping by just numbers for fuzzy match
          plateToTruck[plate] = truckNo;
        }
      }
    }
  }

  // 2. Parse 'GPS สถานที่ปัจจุบัน'
  const gpsSheet = wb.Sheets['GPS สถานที่ปัจจุบัน'];
  if (gpsSheet) {
    const rawRows = xlsx.utils.sheet_to_json(gpsSheet, { header: 1 });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].includes('ทะเบียนรถ')) {
        headerIdx = i; break;
      }
    }
    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const tabienIdx = headers.indexOf('ทะเบียนรถ');
      const statusIdx = headers.indexOf('สถานะรถ');
      const locIdx = headers.indexOf('สถานที่ปัจจุบัน');
      
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[tabienIdx]) continue;
        const tabienStr = String(row[tabienIdx]).trim();
        
        // Extract plate from parentheses e.g. No.054(62-5097) -> 62-5097
        let plate = null;
        const match = tabienStr.match(/\(([^)]+)\)/);
        if (match) {
          plate = match[1].trim();
        } else {
          plate = tabienStr;
        }

        const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
        const loc = row[locIdx] ? String(row[locIdx]).trim() : null;
        
        let targetTruckNo = plateToTruck[plate];
        if (!targetTruckNo && plate) {
          // try fuzzy match
          targetTruckNo = plateToTruck[plate.replace(/[^0-9]/g, '')];
        }

        // If still not found, maybe extract truckNo directly from the prefix
        if (!targetTruckNo) {
           const noMatch = tabienStr.match(/No\.?0*([0-9]+)/i) || tabienStr.match(/^0*([0-9A-Za-z]+)/);
           if (noMatch) {
             const fallbackNo = noMatch[1];
             // find any truck that matches this number
             targetTruckNo = Object.keys(metadata).find(k => k.replace(/[^0-9]/g, '') === fallbackNo.replace(/[^0-9]/g, ''));
           }
        }
        
        if (targetTruckNo) {
           if (!metadata[targetTruckNo]) metadata[targetTruckNo] = {};
           metadata[targetTruckNo].gpsStatus = status;
           metadata[targetTruckNo].gpsLocation = loc;
        }
      }
    }
  }

  console.log('Metadata size:', Object.keys(metadata).length);
  const sample = Object.keys(metadata).slice(0, 3);
  sample.forEach(k => console.log('Truck', k, metadata[k]));

} catch(e) {
  console.log('Error:', e);
}
