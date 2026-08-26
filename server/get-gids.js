const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function run() {
  const auth = new GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  
  try {
    const resTire = await sheets.spreadsheets.get({ spreadsheetId: process.env.TIRE_SHEET_ID });
    console.log('--- TIRE_SHEET ---');
    resTire.data.sheets.forEach(s => {
      console.log(`Title: ${s.properties.title}, GID: ${s.properties.sheetId}`);
    });
  } catch (e) {
    console.log('Error fetching tire sheet', e.message);
  }

  try {
    const resGps = await sheets.spreadsheets.get({ spreadsheetId: process.env.GPS_SHEET_ID });
    console.log('\n--- GPS_SHEET ---');
    resGps.data.sheets.forEach(s => {
      console.log(`Title: ${s.properties.title}, GID: ${s.properties.sheetId}`);
    });
  } catch (e) {
    console.log('Error fetching gps sheet', e.message);
  }
}

run();
