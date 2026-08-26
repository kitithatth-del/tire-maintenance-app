const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

async function testTab(sheets, sheetId, tabName) {
  const start = Date.now();
  console.log(`Testing values.get from sheet ${sheetId} for tab "${tabName}" A1:B10...`);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A1:B10`,
    });
    console.log(`✅ [${tabName}] Success in ${Date.now() - start}ms! Rows: ${res.data.values ? res.data.values.length : 0}`);
  } catch (e) {
    console.log(`❌ [${tabName}] Failed in ${Date.now() - start}ms:`, e.message);
  }
}

async function run() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  
  const TIRE = process.env.TIRE_SHEET_ID;

  // Let's test a few tabs in TIRE_SHEET_ID
  await testTab(sheets, TIRE, "PIVOT LINDE");
  await testTab(sheets, TIRE, "Data");
  await testTab(sheets, TIRE, "รับยางเข้า");
  await testTab(sheets, TIRE, "ข้อมูลเปลี่ยนยาง");
}

run();
