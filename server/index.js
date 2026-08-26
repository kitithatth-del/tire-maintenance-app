const express = require('express');
const cors = require('cors');
const zlib = require('zlib');
const { fetchAllDataStreaming } = require('./services/googleSheets');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ตั้งค่า CORS ล็อคให้เฉพาะเว็บแอปของคุณ (Vercel) และ localhost ดึงข้อมูลได้เท่านั้น
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS Security Policy'));
    }
  }
};

app.use(cors(corsOptions));
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
    // สร้าง gzip stream ที่จะรับข้อมูลทีละชิ้น แทนการเก็บทั้งก้อนก่อน
    const gzip = zlib.createGzip();
    const outputChunks = [];
    
    gzip.on('data', (chunk) => outputChunks.push(chunk));
    
    const gzipDone = new Promise((resolve, reject) => {
      gzip.on('end', resolve);
      gzip.on('error', reject);
    });

    // ส่ง gzip writer เข้าไปใน fetchAllDataStreaming ให้มัน write ตรงๆ เลย
    const stats = await fetchAllDataStreaming(gzip);
    
    // รอให้บีบอัดเสร็จ
    await gzipDone;

    cachedGzipBuffer = Buffer.concat(outputChunks);
    outputChunks.length = 0; // เคลียร์ array

    cachedStats = {
      totalChangeTires: stats.changeCount || 0,
      totalCheckTires: stats.checkCount || 0,
      totalReceiveTires: stats.receiveCount || 0,
      totalTrucks: stats.truckCount || 0,
      lastUpdated: stats.lastUpdated,
      status: 'ready'
    };

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
