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
    let data = await fetchAllData();
    
    // บันทึกสถิติสำหรับ API Status
    cachedStats = {
      totalChangeTires: data.changeCount || 0,
      totalCheckTires: data.checkCount || 0,
      totalReceiveTires: data.receiveCount || 0,
      totalTrucks: data.truckCount || 0,
      lastUpdated: data.lastUpdated,
      status: 'ready'
    };
    
    if (data.useChunks) {
      // ใช้ Streaming เพื่อบีบอัดข้อมูลทีละชิ้น ลดการใช้ RAM สูงสุด
      const gzip = zlib.createGzip();
      const chunks = [];
      
      gzip.on('data', (chunk) => chunks.push(chunk));
      
      const gzipPromise = new Promise((resolve, reject) => {
        gzip.on('end', () => {
          cachedGzipBuffer = Buffer.concat(chunks);
          resolve();
        });
        gzip.on('error', reject);
      });

      gzip.write('{"changeData":[');
      if (data.changeChunks) {
        for (let i = 0; i < data.changeChunks.length; i++) {
          gzip.write(data.changeChunks[i]);
          if (i < data.changeChunks.length - 1) gzip.write(',');
        }
      }
      data.changeChunks = null;

      gzip.write('],"checkData":[');
      if (data.checkChunks) {
        for (let i = 0; i < data.checkChunks.length; i++) {
          gzip.write(data.checkChunks[i]);
          if (i < data.checkChunks.length - 1) gzip.write(',');
        }
      }
      data.checkChunks = null;

      gzip.write('],"receiveData":[');
      if (data.receiveChunks) {
        for (let i = 0; i < data.receiveChunks.length; i++) {
          gzip.write(data.receiveChunks[i]);
          if (i < data.receiveChunks.length - 1) gzip.write(',');
        }
      }
      data.receiveChunks = null;

      gzip.write('],"gpsData":' + (data.gpsDataString || '[]'));
      gzip.write(',"truckData":' + (data.truckDataString || '{}'));
      gzip.write(',"lastUpdated":"' + data.lastUpdated + '"}');
      gzip.end();

      await gzipPromise;
      data = null;
    } else if (data.isPreStringified) {
      let jsonStr = '{"changeData":' + data.changeDataString;
      data.changeDataString = null; // ทิ้งทันที!

      jsonStr += ',"checkData":' + data.checkDataString;
      data.checkDataString = null; // ทิ้งทันที!

      jsonStr += ',"receiveData":' + data.receiveDataString;
      data.receiveDataString = null; // ทิ้งทันที!

      jsonStr += ',"gpsData":' + data.gpsDataString;
      jsonStr += ',"truckData":' + data.truckDataString;
      jsonStr += ',"lastUpdated":"' + data.lastUpdated + '"}';
      
      cachedGzipBuffer = zlib.gzipSync(jsonStr);
      jsonStr = null;
    } else {
      // Fallback สำหรับกรณี XLSX ที่ส่งมาเป็น Array of Objects
      const jsonStr = '{"changeData":' + JSON.stringify(data.changeData || []) + 
                ',"checkData":' + JSON.stringify(data.checkData || []) +
                ',"receiveData":' + JSON.stringify(data.receiveData || []) +
                ',"gpsData":' + JSON.stringify(data.gpsData || []) +
                ',"truckData":' + JSON.stringify(data.truckData || {}) +
                ',"lastUpdated":"' + data.lastUpdated + '"}';
      
      cachedGzipBuffer = zlib.gzipSync(jsonStr);
    }
    
    data = null; // เคลียร์ RAM 100%
    
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
