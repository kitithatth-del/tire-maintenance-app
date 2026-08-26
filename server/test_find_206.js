const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
['รับยางเข้า', 'ข้อมูลเปลี่ยนยาง', 'ตรวจเช็คลมยางดอกยาง'].forEach(sheetName => {
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { range: 1, defval: '', raw: true });
  data.forEach(row => {
    if (JSON.stringify(row).includes('206')) {
      console.log(`Found 206 in ${sheetName}:`, row);
    }
  });
});
