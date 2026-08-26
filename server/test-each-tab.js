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

  console.log('Fetching spreadsheet metadata first...');
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  console.log(`Found ${sheetNames.length} sheets. Testing values.get for A1 on each (with 10s timeout)...`);

  for (const name of sheetNames) {
    const start = Date.now();
    try {
      // Set a short timeout (e.g. 8 seconds) for this request
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${name}'!A1:A1`,
      }, {
        timeout: 8000
      });
      console.log(`✅ [${name}] Success in ${Date.now() - start}ms:`, res.data.values ? res.data.values[0] : 'empty');
    } catch (e) {
      console.log(`❌ [${name}] Failed in ${Date.now() - start}ms:`, e.message);
    }
  }
}

run().catch(console.error);
