const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function run() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.TIRE_SHEET_ID;

  // Let's try fetching a single chunk (A1:Z5000) from "รับยางเข้า"
  console.log('Testing values.get for "รับยางเข้า"!A1:Z5000...');
  const start = Date.now();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'รับยางเข้า'!A1:Z5000",
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    console.log(`✅ Success in ${Date.now() - start}ms! Rows: ${res.data.values ? res.data.values.length : 0}`);
  } catch (e) {
    console.log(`❌ Failed in ${Date.now() - start}ms:`, e.message);
  }
}

run();
