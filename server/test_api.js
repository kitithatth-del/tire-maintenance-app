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
  console.log('✅ Token ได้แล้ว, length:', token.length);
  
  const start = Date.now();
  const encoded = encodeURIComponent('รับยางเข้า!A1:D10');
  
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT 15s')), 15000);
    const req = https.request({
      hostname: 'sheets.googleapis.com',
      path: '/v4/spreadsheets/' + process.env.TIRE_SHEET_ID + '/values/' + encoded,
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(timer);
        const parsed = JSON.parse(d);
        console.log('Status:', res.statusCode, 'Time:', Date.now() - start + 'ms', 'Rows:', parsed.values?.length);
        if (parsed.error) console.log('Error:', parsed.error);
        resolve();
      });
    });
    req.on('error', e => { clearTimeout(timer); reject(e); });
    req.end();
  });
}
test().catch(e => console.error('ERROR:', e.message));
