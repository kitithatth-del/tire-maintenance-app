const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const path = require('path');
require('dotenv').config();

async function testFetch() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  const start = Date.now();
  const encoded = encodeURIComponent('รับยางเข้า!A1');
  const query = '?valueRenderOption=UNFORMATTED_VALUE';
  
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT 120s')), 120000);
    const req = https.request({
      hostname: 'sheets.googleapis.com',
      path: '/v4/spreadsheets/' + process.env.TIRE_SHEET_ID + '/values/' + encoded + query,
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(timer);
        console.log('Status:', res.statusCode, 'Time:', (Date.now() - start)/1000, 's');
        if (res.statusCode === 200) {
          const parsed = JSON.parse(d);
          console.log('Value:', parsed.values);
        } else {
          console.log('Error payload:', d.substring(0, 200));
        }
        resolve();
      });
    });
    req.end();
  });
}
testFetch().catch(console.error);
