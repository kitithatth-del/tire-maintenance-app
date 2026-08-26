const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function testCSV() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  const start = Date.now();
  console.log('Downloading CSV...');
  
  try {
    const res = await axios({
      method: 'GET',
      url: `https://docs.google.com/spreadsheets/d/${process.env.TIRE_SHEET_ID}/export?format=csv&gid=1471130554`,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream('test.csv');
    res.data.pipe(writer);
    
    writer.on('finish', () => {
      console.log(`✅ Download finished in ${(Date.now() - start) / 1000}s`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}
testCSV();
