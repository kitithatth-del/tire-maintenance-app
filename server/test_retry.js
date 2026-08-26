const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchInChunksWithRetry(sheets, spreadsheetId, sheetName, startCol, endCol, maxRows, chunkSize = 2500) {
  let allRows = [];
  for (let start = 1; start <= maxRows; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, maxRows);
    const range = sheetName + '!' + startCol + start + ':' + endCol + end;
    console.log('  ⬇️ กำลังดึง ' + range + '...');
    
    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        if (res.data.values && res.data.values.length > 0) {
          allRows = allRows.concat(res.data.values);
          console.log('    ✅ ได้ ' + res.data.values.length + ' แถว (รวมสะสม: ' + allRows.length + ')');
          if (res.data.values.length < (end - start + 1)) {
            // Reached end of sheet
            return allRows;
          }
        } else {
          return allRows;
        }
        success = true;
        break;
      } catch (err) {
        console.warn('    ⚠️ ลองใหม่รอบ ' + attempt + '/3 เนื่องจาก: ' + err.message);
        await sleep(3000 * attempt);
      }
    }
    if (!success) {
      console.error('    ❌ ข้ามบล็อก ' + range + ' เนื่องจากลอง 3 ครั้งแล้วไม่สำเร็จ');
    }
    await sleep(1500);
  }
  return allRows;
}

async function runTest() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  console.log('--- เริ่มทดสอบดึง "รับยางเข้า" ด้วยบล็อก 2,500 แถว + Auto Retry ---');
  const start = Date.now();
  const rows = await fetchInChunksWithRetry(sheets, process.env.TIRE_SHEET_ID, 'รับยางเข้า', 'A', 'Y', 25000, 2500);
  console.log('🎉 สรุปผล: ได้ข้อมูลทั้งหมด ' + rows.length + ' แถว ในเวลา ' + ((Date.now()-start)/1000) + ' วินาที');
}

runTest();