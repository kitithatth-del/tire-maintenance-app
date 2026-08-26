const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const spreadsheetId = process.env.TIRE_SHEET_ID;

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  
  console.log(`Testing XLSX Export via Sheets docs endpoint for ${spreadsheetId}...`);
  const start = Date.now();
  try {
    const res = await axios({
      method: 'GET',
      url: url,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream',
      timeout: 60000
    });
    
    const writer = fs.createWriteStream('test_export.xlsx');
    res.data.pipe(writer);
    
    writer.on('finish', () => {
      console.log(`✅ Success in ${(Date.now() - start)/1000}s! File saved as test_export.xlsx`);
    });
    writer.on('error', (err) => {
      console.log('❌ Writer error:', err.message);
    });
  } catch (e) {
    console.log(`❌ Failed in ${(Date.now() - start)/1000}s:`, e.response ? `${e.response.status} - ${e.response.statusText}` : e.message);
    if (e.response && e.response.data) {
      // Since responseType is stream, e.response.data is a stream. We need to read it to see the error.
      try {
        const body = await new Promise((resolve) => {
          let data = '';
          e.response.data.on('data', chunk => data += chunk);
          e.response.data.on('end', () => resolve(data));
        });
        console.log('Error Body:', body.substring(0, 500));
      } catch (err) {
        console.log('Could not read error body');
      }
    }
  }
}

run();
