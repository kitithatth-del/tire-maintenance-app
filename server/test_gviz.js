const axios = require('axios');
const fs = require('fs');
require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

async function testGviz() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const url = `https://docs.google.com/spreadsheets/d/${process.env.TIRE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=รับยางเข้า`;
  console.log('Requesting:', url);
  
  const start = Date.now();
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Success! Time: ${(Date.now() - start)/1000}s`);
    console.log('Data sample:', res.data.substring(0, 200));
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
    }
  }
}

testGviz();
