const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('.');
const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
const wb = xlsx.readFile(excelFile);

// Get all truck numbers from tire data
const tireSheet = wb.Sheets['ข้อมูลเปลี่ยนยาง'];
const tireRows = xlsx.utils.sheet_to_json(tireSheet, { header: 1 });
let headerIdx = -1;
for (let i = 0; i < 5; i++) {
  if (tireRows[i] && tireRows[i].includes('เบอร์รถ')) { headerIdx = i; break; }
}
const tireHeaderCols = tireRows[headerIdx];
const tireColIdx = tireHeaderCols.indexOf('เบอร์รถ');
const tireTrucks = [...new Set(tireRows.slice(headerIdx + 1).map(r => r && r[tireColIdx]).filter(v => v != null))].sort();
console.log('Truck numbers in Tire Data:', tireTrucks.slice(0, 30));

// GPS - all truck numbers from col A
const gpsSheet = wb.Sheets['GPS สถานที่ปัจจุบัน'];
const gpsRows = xlsx.utils.sheet_to_json(gpsSheet, { header: 1 });
const gpsTrucks = gpsRows.slice(1).map(r => r && r[0]).filter(v => v != null && v !== '');
console.log('\nTruck numbers in GPS (col A):', gpsTrucks.slice(0, 30));

// Data รถ - all truck numbers
const dataSheet = wb.Sheets['Data รถ'];
const dataRows = xlsx.utils.sheet_to_json(dataSheet, { header: 1 });
let dHeaderIdx = -1;
for (let i = 0; i < 5; i++) {
  if (dataRows[i] && dataRows[i].includes('เบอร์รถ')) { dHeaderIdx = i; break; }
}
const dHeaders = dataRows[dHeaderIdx];
const dTruckIdx = dHeaders.indexOf('เบอร์รถ');
const dataTrucks = dataRows.slice(dHeaderIdx + 1).map(r => r && r[dTruckIdx]).filter(v => v != null && v !== '');
console.log('\nTruck numbers in Data รถ:', dataTrucks.slice(0, 30));

// Cross-reference
console.log('\n=== OVERLAP CHECK ===');
tireTrucks.slice(0, 10).forEach(t => {
  const inGps = gpsTrucks.some(g => String(g) === String(t));
  const inData = dataTrucks.some(d => String(d).replace(/[^0-9]/g, '') === String(t).replace(/[^0-9]/g, ''));
  console.log(`Tire truck "${t}": GPS=${inGps}, Data รถ=${inData}`);
});
