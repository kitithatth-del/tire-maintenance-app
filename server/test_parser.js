const { processTireData, getDashboardStats } = require('../src/utils/dataParser.js');
const axios = require('axios');
async function run() {
  const r = await axios.get('http://localhost:3001/api/data');
  const d = r.data;
  const combined = [
    ...(d.changeData || []).map(r => ({...r, _sheet: 'เปลี่ยนยาง'})),
    ...(d.checkData || []).map(r => ({...r, _sheet: 'ตรวจเช็ค'}))
  ];
  console.log('Combined length:', combined.length);
  const p = processTireData(combined);
  console.log('Processed length:', p.length);
  const stats = getDashboardStats(p);
  console.log('Stats totalRemoved:', stats.totalRemoved);
  console.log('Stats complianceRate:', stats.complianceRate);
}
run();
