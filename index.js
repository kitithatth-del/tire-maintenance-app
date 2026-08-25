const express = require('express');
const cors = require('cors');
const zlib = require('zlib');
const { fetchAllData } = require('./services/googleSheets');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Memory Cache สำหรับเก็บข้อมูลที่ดึงมาจาก Google Sheets
let cachedStats = {
  totalChangeTires: 0,
  totalCheckTires: 0,
  totalReceiveTires: 0,
  totalTrucks: 0,
  lastUpdated: null,
  status: 'initializing' // 'initializing', 'ready', 'error'
};

let cachedGzipBuffer = null;
let isFetching = false;

async function updateCache() {
  if (isFetching) {
    console.log('[Scheduler] ข้ามรอบนี้ เนื่องจากกำลังดึงข้อมูลอยู่');
    return;
  }
  isFetching = true;
  const timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false });
  console.log(`[${timestamp}] เริ่มดึงข้อมูลจาก Google Sheets...`);
  try {
    const data = await fetchAllData();
    
    // บันทึกสถิติสำหรับ API Status
    cachedStats = {
      totalChangeTires: data.changeData ? data.changeData.length : 0,
      totalCheckTires: data.checkData ? data.checkData.length : 0,
      totalReceiveTires: data.receiveData ? data.receiveData.length : 0,
      totalTrucks: data.truckData ? Object.keys(data.truckData).length : 0,
      lastUpdated: data.lastUpdated,
      status: 'ready'
    };
    
    // บีบอัดข้อมูลแบบทยอยต่อ String (Incremental) เพื่อไม่ให้ RAM พุ่งทะลุ 512MB
    let jsonStr = '{"changeData":';
    jsonStr += JSON.stringify(data.changeData || []);
    data.changeData = null; // ทิ้งทันที!

    jsonStr += ',"checkData":';
    jsonStr += JSON.stringify(data.checkData || []);
    data.checkData = null; // ทิ้งทันที!

    jsonStr += ',"receiveData":';
    jsonStr += JSON.stringify(data.receiveData || []);
    data.receiveData = null; // ทิ้งทันที!

    jsonStr += ',"gpsData":' + JSON.stringify(data.gpsData || []);
    jsonStr += ',"truckData":' + JSON.stringify(data.truckData || {});
    data.truckData = null;

    jsonStr += ',"lastUpdated":"' + data.lastUpdated + '"}';
    
    cachedGzipBuffer = zlib.gzipSync(jsonStr);
    jsonStr = null; // ทิ้ง string ก้อนใหญ่ทันที
    
    const ts2 = new Date().toLocaleTimeString('th-TH', { hour12: false });
    console.log(`[${ts2}] ✅ อัปเดตข้อมูลสำเร็จ! (ขนาดบีบอัด: ${(cachedGzipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', error.message);
    if (cachedStats.status === 'initializing') {
      cachedStats.status = 'error';
    }
  } finally {
    isFetching = false;
  }
}

// เริ่มรันเซิร์ฟเวอร์ก่อน แล้วค่อยดึงข้อมูล
app.listen(PORT, () => {
  console.log(`🚀 Backend Server กำลังรันอยู่ที่ http://localhost:${PORT}`);
  console.log(`🕒 อัปเดตอัตโนมัติทุก 30 นาที`);
  updateCache();
  setInterval(() => {
    updateCache();
  }, 30 * 60 * 1000);
});


// ==========================================
// API Endpoints
// ==========================================

// API เช็คสถานะเซิร์ฟเวอร์
app.get('/api/status', (req, res) => {
  res.json({
    status: cachedStats.status,
    lastUpdated: cachedStats.lastUpdated,
    totalChangeTires: cachedStats.totalChangeTires,
    totalCheckTires: cachedStats.totalCheckTires,
    totalReceiveTires: cachedStats.totalReceiveTires,
    totalTrucks: cachedStats.totalTrucks,
  });
});

// API สั่งดึงข้อมูลใหม่ทันที (Force Sync)
app.get('/api/sync', async (req, res) => {
  updateCache();
  res.json({ success: true, message: 'กำลังดึงข้อมูลใหม่ในพื้นหลัง โปรดรอสักครู่' });
});

// API ข้อมูลหลัก
app.get('/api/data', (req, res) => {
  if (cachedStats.status === 'initializing') {
    return res.status(503).json({ error: 'ข้อมูลกำลังถูกโหลด กรุณารอสักครู่', status: 'initializing' });
  }
  if (cachedStats.status === 'error') {
    return res.status(503).json({ error: 'ไม่สามารถดึงข้อมูลได้', status: 'error' });
  }

  // ส่งข้อมูลแบบ Gzip หาก Client รองรับ (เบราว์เซอร์ทุกตัวรองรับ)
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip') && cachedGzipBuffer) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Content-Encoding', 'gzip');
    return res.send(cachedGzipBuffer);
  }

  if (cachedGzipBuffer) {
    const unzipped = zlib.gunzipSync(cachedGzipBuffer);
    res.set('Content-Type', 'application/json; charset=utf-8');
    return res.send(unzipped);
  }

  res.status(500).json({ error: 'No data available' });
});
