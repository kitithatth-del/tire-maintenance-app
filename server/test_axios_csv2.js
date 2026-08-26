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
  
  console.log('Downloading CSV...');
  
  try {
    const res = await axios({
      method: 'GET',
      url: \https://docs.google.com/spreadsheets/d/\/export?format=csv&gid=1471130554\,
      headers: { Authorization: \Bearer \\ },
    });
    
    console.log(res.data.substring(0, 500));
  } catch (err) {
    console.error('❌ Error:', err.response ? err.response.data : err.message);
  }
}
testCSV();
