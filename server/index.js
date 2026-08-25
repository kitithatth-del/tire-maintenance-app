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
let cachedData = {
  receiveData: [],
  changeData: [],
  checkData: [],
  gpsData: [],
  truckData: {},
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
    cachedData = {
      ...data,
      status: 'ready'
    };
    
    // บีบอัดข้อมูลเป็น Gzip ทันทีเพื่อประหยัด RAM และส่งข้อมูลได้เร็วระดับเสี้ยววินาที
    const jsonStr = JSON.stringify({
      changeData: cachedData.changeData,
      checkData: cachedData.checkData,
      receiveData: cachedData.receiveData,
      gpsData: cachedData.gpsData,
      truckData: cachedData.truckData,
      lastUpdated: cachedData.lastUpdated
    });
    cachedGzipBuffer = zlib.gzipSync(jsonStr);
    
    const ts2 = new Date().toLocaleTimeString('th-TH', { hour12: false });
    console.log(`[${ts2}] ✅ อัปเดตข้อมูลสำเร็จ! (ขนาดบีบอัด: ${(cachedGzipBuffer.length / 1024 / 1024).toFixed(2)} MB) เปลี่ยนยาง:${cachedData.changeData.length} ตรวจเช็ค:${cachedData.checkData.length} รับยาง:${cachedData.receiveData.length}`);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', error.message);
    if (cachedData.status === 'initializing') {
      cachedData.status = 'error';
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
    status: cachedData.status,
    lastUpdated: cachedData.lastUpdated,
    totalChangeTires: cachedData.changeData ? cachedData.changeData.length : 0,
    totalCheckTires: cachedData.checkData ? cachedData.checkData.length : 0,
    totalReceiveTires: cachedData.receiveData ? cachedData.receiveData.length : 0,
    totalTrucks: cachedData.truckData ? Object.keys(cachedData.truckData).length : 0,
  });
});

// API สั่งดึงข้อมูลใหม่ทันที (Force Sync)
app.get('/api/sync', async (req, res) => {
  updateCache();
  res.json({ success: true, message: 'กำลังดึงข้อมูลใหม่ในพื้นหลัง โปรดรอสักครู่' });
});

// API ข้อมูลหลัก
app.get('/api/data', (req, res) => {
  if (cachedData.status === 'initializing') {
    return res.status(503).json({ error: 'ข้อมูลกำลังถูกโหลด กรุณารอสักครู่', status: 'initializing' });
  }
  if (cachedData.status === 'error') {
    return res.status(503).json({ error: 'ไม่สามารถดึงข้อมูลได้', status: 'error' });
  }

  // ส่งข้อมูลแบบ Gzip หาก Client รองรับ (เบราว์เซอร์ทุกตัวรองรับ)
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip') && cachedGzipBuffer) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Content-Encoding', 'gzip');
    return res.send(cachedGzipBuffer);
  }

  res.json({
    changeData: cachedData.changeData,
    checkData: cachedData.checkData,
    receiveData: cachedData.receiveData,
    gpsData: cachedData.gpsData,
    truckData: cachedData.truckData,
    lastUpdated: cachedData.lastUpdated
  });
});
