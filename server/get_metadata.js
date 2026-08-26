const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const path = require('path');
require('dotenv').config();

async function test() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  const req = https.request({
    hostname: 'sheets.googleapis.com',
    path: '/v4/spreadsheets/' + process.env.TIRE_SHEET_ID,
    headers: { Authorization: 'Bearer ' + token }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const parsed = JSON.parse(d);
      console.log(parsed.sheets?.map(s => ({ title: s.properties.title, sheetId: s.properties.sheetId })));
    });
  });
  req.end();
}
test();
