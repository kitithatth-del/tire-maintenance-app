const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

async function testDownloadCSV(gid, name) {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  console.log(`Downloading CSV for ${name} (gid=${gid})...`);
  const start = Date.now();
  
  const res = await axios({
    method: 'GET',
    url: `https://docs.google.com/spreadsheets/d/${process.env.TIRE_SHEET_ID}/export?format=csv&gid=${gid}`,
    headers: { Authorization: `Bearer ${token}` },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300000
  });
  
  console.log(`  ✅ Downloaded in ${(Date.now()-start)/1000}s. Size: ${res.data.length} chars.`);
  const records = parse(res.data, { skip_empty_lines: true, relax_column_count: true });
  console.log(`  ✅ Parsed ${records.length} rows.`);
  return records;
}

async function run() {
  try {
    await testDownloadCSV(328625915, 'ข้อมูลเปลี่ยนยาง');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();