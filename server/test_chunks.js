const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function fetchInChunks(sheets, spreadsheetId, sheetName, startCol, endCol, maxRows, chunkSize = 5000) {
  let allRows = [];
  for (let start = 1; start <= maxRows; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, maxRows);
    const range = sheetName + '!' + startCol + start + ':' + endCol + end;
    console.log('  ⬇️ Fetching ' + range + '...');
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    if (res.data.values && res.data.values.length > 0) {
      allRows = allRows.concat(res.data.values);
    } else {
      break;
    }
  }
  return allRows;
}

async function test() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const start = Date.now();
  console.log('Testing Chunked Fetch for ข้อมูลเปลี่ยนยาง (40,000 rows in chunks of 5,000)...');
  try {
    const rows = await fetchInChunks(sheets, process.env.TIRE_SHEET_ID, 'ข้อมูลเปลี่ยนยาง', 'A', 'O', 40000, 5000);
    console.log('✅ Success! Total rows fetched: ' + rows.length + ' in ' + ((Date.now()-start)/1000) + 's');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
