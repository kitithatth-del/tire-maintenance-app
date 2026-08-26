const axios = require('axios');
async function run() {
  const r = await axios.get('http://localhost:3001/api/data');
  const d = r.data;
  const combined = [
    ...(d.changeData || []).map(r => ({ ...r, _sheet: 'เปลี่ยนยาง' })),
    ...(d.checkData || []).map(r => ({ ...r, _sheet: 'ตรวจเช็ค' })),
    ...(d.receiveData || []).map(r => ({ ...r, _sheet: 'รับยาง' }))
  ];
  console.log("Combined length:", combined.length);
  if (combined.length > 0) {
    console.log("Sample 1 (Change):", combined[0]);
    console.log("Sample 2 (Check):", combined[d.changeData.length]);
  }
}
run();
