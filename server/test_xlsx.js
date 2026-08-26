const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testXlsx() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const url = `https://www.googleapis.com/drive/v3/files/${process.env.TIRE_SHEET_ID}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  
  console.log('Downloading XLSX...');
  const start = Date.now();
  
  try {
    const res = await axios({
      method: 'GET',
      url: url,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream('test.xlsx');
    res.data.pipe(writer);
    
    writer.on('finish', () => {
      console.log(`✅ Download finished in ${(Date.now() - start)/1000}s`);
    });
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
    }
  }
}
testXlsx();
