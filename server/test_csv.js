const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const path = require('path');
require('dotenv').config();

async function testCSV() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  const start = Date.now();
  console.log('Token acquired. Exporting CSV...');
  
  const req = https.request({
    hostname: 'docs.google.com',
    path: `/spreadsheets/d/${process.env.TIRE_SHEET_ID}/export?format=csv&gid=1471130554`,
    headers: { Authorization: 'Bearer ' + token }
  }, res => {
    // docs.google.com sometimes redirects (307)
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
       console.log('Redirecting to:', res.headers.location);
       const redirectUrl = new URL(res.headers.location);
       const req2 = https.request({
         hostname: redirectUrl.hostname,
         path: redirectUrl.pathname + redirectUrl.search,
         headers: { Authorization: 'Bearer ' + token }
       }, res2 => {
         let d = '';
         res2.on('data', c => d += c);
         res2.on('end', () => {
           console.log('Status 2:', res2.statusCode);
           console.log('Length:', d.length);
           console.log('Time:', (Date.now()-start)/1000, 's');
           console.log('Sample:', d.substring(0, 100));
         });
       });
       req2.end();
       return;
    }

    console.log('Status:', res.statusCode);
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Length:', d.length);
      console.log('Time:', (Date.now()-start)/1000, 's');
      if (res.statusCode === 200) {
        console.log('Sample:', d.substring(0, 100));
      } else {
        console.log('Error:', d.substring(0, 100));
      }
    });
  });
  req.end();
}
testCSV().catch(console.error);
