const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

async function run() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const url = `https://www.googleapis.com/drive/v3/files/${process.env.TIRE_SHEET_ID}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Success:', res.status);
  } catch (e) {
    console.log('Status:', e.response ? e.response.status : 'no response');
    if (e.response && e.response.data) {
      console.log('Error Body:', JSON.stringify(e.response.data));
    } else {
      console.log('Error Message:', e.message);
    }
  }
}

run();
