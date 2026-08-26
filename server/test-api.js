const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const TIRE_SHEET_ID = process.env.TIRE_SHEET_ID;
const MASTER_SHEET_ID = process.env.GPS_SHEET_ID;

async function test() {
  console.log('TIRE_SHEET_ID:', TIRE_SHEET_ID);
  console.log('MASTER_SHEET_ID:', MASTER_SHEET_ID);

  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  console.log('Token OK:', token ? token.substring(0, 30) + '...' : 'NULL');

  // Test 1: CSV export รับยางเข้า (GID 1471130554)
  console.log('\n--- Test 1: CSV Export รับยางเข้า ---');
  try {
    const url = `https://docs.google.com/spreadsheets/d/${TIRE_SHEET_ID}/export?format=csv&gid=1471130554`;
    console.log('URL:', url);
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
      maxContentLength: Infinity
    });
    console.log('✅ Status:', res.status, '| Data length:', res.data.length, 'chars');
  } catch (e) {
    console.log('❌ Error:', e.response ? `${e.response.status} - ${e.response.statusText}` : e.message);
    if (e.response && e.response.data) {
      const d = typeof e.response.data === 'string' ? e.response.data.substring(0, 500) : JSON.stringify(e.response.data).substring(0, 500);
      console.log('Response body:', d);
    }
  }

  // Test 2: CSV export ข้อมูลเปลี่ยนยาง (GID 328625915)
  console.log('\n--- Test 2: CSV Export ข้อมูลเปลี่ยนยาง ---');
  try {
    const url = `https://docs.google.com/spreadsheets/d/${TIRE_SHEET_ID}/export?format=csv&gid=328625915`;
    console.log('URL:', url);
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
      maxContentLength: Infinity
    });
    console.log('✅ Status:', res.status, '| Data length:', res.data.length, 'chars');
  } catch (e) {
    console.log('❌ Error:', e.response ? `${e.response.status} - ${e.response.statusText}` : e.message);
    if (e.response && e.response.data) {
      const d = typeof e.response.data === 'string' ? e.response.data.substring(0, 500) : JSON.stringify(e.response.data).substring(0, 500);
      console.log('Response body:', d);
    }
  }

  // Test 3: Sheets API v4 ข้อมูลเปลี่ยนยาง (rows 1-100)
  console.log('\n--- Test 3: Sheets API v4 ข้อมูลเปลี่ยนยาง A1:Z100 ---');
  try {
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: TIRE_SHEET_ID,
      range: "'ข้อมูลเปลี่ยนยาง'!A1:Z100",
      valueRenderOption: 'FORMATTED_VALUE'
    });
    const rows = res.data.values || [];
    console.log('✅ Rows returned:', rows.length);
    if (rows.length > 0) console.log('Header row:', rows[0].slice(0, 10));
    if (rows.length > 1) console.log('Data row 1:', rows[1].slice(0, 10));
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

test().catch(console.error);
