const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config();

const TIRE_SHEET_ID = process.env.TIRE_SHEET_ID;
const MASTER_SHEET_ID = process.env.GPS_SHEET_ID;

const normalizeTruckId = (t) => {
  if (!t) return '';
  let s = String(t).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  s = s.replace(/^[NTW](?=[0-9])/g, '');
  return s;
};

const extractMetadataFromRaw = (truckDataRaw, gpsDataRaw) => {
  const metadata = {};
  if (truckDataRaw && truckDataRaw.length > 0) {
    const rawRows = truckDataRaw;
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => c && ['เบอร์รถ', 'สถานะรถ', 'ทะเบียนรถ'].includes(String(c).replace(/\s+/g, '')))) {
        headerIdx = i; break;
      }
    }
    if (headerIdx === -1 && rawRows.length > 1) headerIdx = 1;
    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const getIdx = (name) => headers.findIndex(c => c && String(c).replace(/\s+/g, '') === name);
      const truckNoIdx = getIdx('เบอร์รถ'); // Find dynamically instead of hardcoding 96
      const plateIdx = getIdx('ทะเบียนรถ') !== -1 ? getIdx('ทะเบียนรถ') : headers.findIndex(c => c && String(c).replace(/\s+/g, '').includes('ทะเบียน'));
      const statusIdx = getIdx('สถานะรถ') !== -1 ? getIdx('สถานะรถ') : headers.findIndex(c => c && String(c).replace(/\s+/g, '').includes('สถานะ'));
      const typeIdx = getIdx('ประเภทรถ') !== -1 ? getIdx('ประเภทรถ') : headers.findIndex(c => c && String(c).match(/ประเภท|ชนิด|ลักษณะ/));
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || truckNoIdx === -1 || !row[truckNoIdx]) continue;
        const rawTruckNo = String(row[truckNoIdx]).trim();
        const truckNo = normalizeTruckId(rawTruckNo) || rawTruckNo;
        const plate = row[plateIdx] ? String(row[plateIdx]).trim() : null;
        const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
        const type = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : '';
        if (!metadata[truckNo]) metadata[truckNo] = {};
        const isBackup = row.some(cell => cell && (String(cell).includes('สำรอง') || String(cell).includes('Tหาง') || String(cell).includes('หางสำรอง')));
        const isPrimaryType = (type.includes('หัวลาก') || type.includes('กึ่งพ่วง')) && !isBackup;
        if (isPrimaryType || !metadata[truckNo].truckType) {
          if (!isBackup) {
            const existingType = metadata[truckNo].truckType || '';
            const isCombo = (existingType.includes('หัวลาก') && type.includes('กึ่งพ่วง')) || (existingType.includes('กึ่งพ่วง') && type.includes('หัวลาก'));
            
            if (isCombo) {
              metadata[truckNo].truckType = 'เทรลเลอร์';
              const existingPlate = metadata[truckNo].plate || '';
              if (existingType.includes('หัวลาก')) {
                 metadata[truckNo].plate = existingPlate + (plate ? ' / ' + plate : '');
              } else {
                 metadata[truckNo].plate = (plate ? plate + ' / ' : '') + existingPlate;
              }
            } else {
              metadata[truckNo].truckType = type;
              metadata[truckNo].plate = plate;
            }
            if (status) metadata[truckNo].truckStatus = status;
          }
        }
      }
    }
  }
  if (gpsDataRaw && gpsDataRaw.length > 0) {
    const rawRows = gpsDataRaw;
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => c && String(c).replace(/\s+/g, '') === 'ทะเบียนรถ')) {
        headerIdx = i; break;
      }
    }
    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const getIdx = (name) => headers.findIndex(c => c && String(c).replace(/\s+/g, '') === name);
      const tabienIdx = getIdx('ทะเบียนรถ');
      const statusIdx = getIdx('สถานะรถ');
      const locIdx = getIdx('สถานที่ปัจจุบัน');
      const timeIdx = headers.findIndex(c => c && String(c).replace(/\s+/g, '').match(/วัน\/เวลา|วันที่\/เวลา|วันเวลา|เวลาปัจจุบัน|เวลา/));
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;
        let targetTruckNo = (row[0] !== null && row[0] !== undefined && String(row[0]).trim() !== '') ? String(row[0]).trim() : null;
        const status = (statusIdx !== -1 && row[statusIdx]) ? String(row[statusIdx]).trim() : null;
        const loc = (locIdx !== -1 && row[locIdx]) ? String(row[locIdx]).trim() : null;
        const timeVal = (timeIdx !== -1 && row[timeIdx]) ? row[timeIdx] : null;
        let timeStr = timeVal ? String(timeVal).trim() : null;
        if (!targetTruckNo && row[tabienIdx]) {
          const tabienStr = String(row[tabienIdx]).trim();
          let plate = null;
          const match = tabienStr.match(/\(([^)]+)\)/);
          if (match) plate = match[1].trim();
          else plate = tabienStr.replace(/[^0-9ก-ฮ]/g, '');
          targetTruckNo = Object.keys(metadata).find(k => {
             const mPlate = metadata[k].plate;
             if (!mPlate) return false;
             return mPlate.replace(/[^0-9]/g, '') === plate.replace(/[^0-9]/g, '');
          });
        }
        if (targetTruckNo) {
          const truckNo = normalizeTruckId(targetTruckNo) || targetTruckNo;
          if (!metadata[truckNo]) metadata[truckNo] = {};
          if (status) metadata[truckNo].gpsStatus = status;
          if (loc) metadata[truckNo].gpsLocation = loc;
          if (timeStr) metadata[truckNo].gpsTime = timeStr;
        }
      }
    }
  }
  return metadata;
};

// แปลงข้อมูลดิบ (Array of Arrays) เป็น Array of Objects
// รองรับ 2 รูปแบบ:
//   1. Array of Arrays จาก GAS (row[0]=group header, row[1]=field names, row[2+]=data)
//   2. Array of Objects จาก future use
const getTireDataFromRaw = (rawData) => {
  if (!rawData || rawData.length === 0) return [];

  if (rawData.length > 0 && !Array.isArray(rawData[0])) {
    return rawData;
  }

  // รูปแบบที่ 1: Array of Arrays (จาก GAS หรือ XLSX)
  if (rawData.length < 2) return [];

  // ค้นหาแถว header (แถวที่มีคำว่า "วันที่บันทึก" หรือ "ประเภทแบบฟอร์ม")
  let groupHeaderRow = null;
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawData.length, 5); i++) {
    const row = rawData[i];
    if (!row) continue;
    const hasDateCol = row.some(c => c && String(c).replace(/\s+/g,'') === 'วันที่บันทึก');
    if (hasDateCol) { headerRowIdx = i; break; }
  }

  // ถ้าแถวก่อน header เป็น group header (มีคำว่า "ยางเข้า" หรือ "ยางออก")
  if (headerRowIdx > 0) {
    const prevRow = rawData[headerRowIdx - 1];
    if (prevRow && prevRow.some(c => c && (String(c).includes('ยางเข้า') || String(c).includes('ยางออก')))) {
      groupHeaderRow = prevRow;
    }
  }

  if (headerRowIdx === -1) {
    // fallback: row 1 as header
    headerRowIdx = 1;
  }

  const headers = rawData[headerRowIdx];

  // สร้าง column key mapping โดยใช้ group header เพื่อแยก _เข้า/_ออก
  const colKeys = [];
  const seenNames = {};
  let currentGroup = ''; // 'เข้า' หรือ 'ออก'

  for (let j = 0; j < headers.length; j++) {
    // อัปเดต group จาก group header row
    if (groupHeaderRow && groupHeaderRow[j]) {
      const g = String(groupHeaderRow[j]).trim();
      if (g.includes('ยางเข้า') || g.includes('ตรวจเช็ค')) currentGroup = 'เข้า';
      else if (g.includes('ยางออก')) currentGroup = 'ออก';
    }

    let rawKey = headers[j];
    if (rawKey === undefined || rawKey === null) { colKeys.push(null); continue; }
    let key = String(rawKey).replace(/\r\n/g, '').replace(/\n/g, '').trim();
    if (!key || key === '#REF!' || key === '#N/A') { colKeys.push(null); continue; }

    // เพิ่ม suffix group ถ้าชื่อซ้ำและอยู่ในกลุ่มยาง
    let finalKey = key;
    const tireGroupFields = ['หมายเลขยาง', 'D1', 'D2', 'D3', 'D4', 'ชนิด/ขนาดยาง'];
    if (tireGroupFields.includes(key) && currentGroup) {
      finalKey = `${key}_${currentGroup}`;
    }

    // จัดการ alias เดิม (backward compat กับ XLSX)
    if (finalKey === 'หมายเลขยาง') finalKey = 'หมายเลขยาง_เข้า';
    if (finalKey === 'หมายเลขยาง_1') finalKey = 'หมายเลขยาง_ออก';
    if (finalKey === 'D1_1') finalKey = 'D1_ออก';
    if (finalKey === 'D2_1') finalKey = 'D2_ออก';
    if (finalKey === 'D3_1') finalKey = 'D3_ออก';
    if (finalKey === 'D4_1') finalKey = 'D4_ออก';
    if (finalKey === 'ชนิด/ขนาดยาง') finalKey = 'ชนิด/ขนาดยาง_เข้า';
    if (finalKey === 'ชนิด/ขนาดยาง_1') finalKey = 'ชนิด/ขนาดยาง_ออก';
    if (finalKey === 'แรงดันก่อน\n(PSI)' || finalKey === 'แรงดันก่อน(PSI)') finalKey = 'แรงดันก่อน(PSI)';
    if (finalKey === 'แรงดันหลัง\n(PSI)' || finalKey === 'แรงดันหลัง(PSI)') finalKey = 'แรงดันหลัง(PSI)';
    if (finalKey === 'ตำแหน่ง\nล้อยาง' || finalKey === 'ตำแหน่งล้อยาง') finalKey = 'ตำแหน่งล้อยาง';

    // ถ้า key ซ้ำให้ skip
    if (seenNames[finalKey]) { colKeys.push(`__dup_${finalKey}`); continue; }
    seenNames[finalKey] = true;
    colKeys.push(finalKey);
  }


  const data = [];
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const nonEmpty = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (!nonEmpty) continue;

    let obj = {};
    for (let j = 0; j < colKeys.length; j++) {
      const k = colKeys[j];
      if (!k || k.startsWith('__dup_')) continue;
      const val = row[j];
      obj[k] = (val === undefined || val === null || val === '') ? null : String(val).trim();
    }
    data.push(obj);
  }
  return data;
};


async function downloadXlsx(token, spreadsheetId, filename) {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
  const res = await axios({
    method: 'GET',
    url,
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'stream',
    timeout: 300000 // 5 minutes
  });
  
  const writer = fs.createWriteStream(filename);
  res.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function fetchAllData() {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  if (gasUrl && gasUrl.trim() !== '') {
    console.log('🔄 เริ่มดึงข้อมูลทั้งหมดผ่าน Google Apps Script Web App (แบบ Pagination)...');
    try {
      const fetchPaged = async (type) => {
        const allDataChunks = [];
        let start = 1;
        const limit = 10000;
        let hasMore = true;
        let count = 0;
        while (hasMore) {
          console.log(`  - กำลังดึงข้อมูล ${type} (เริ่มบรรทัดที่ ${start})...`);
          const url = `${gasUrl.trim()}?type=${type}&start=${start}&limit=${limit}`;
          const res = await axios.get(url, { timeout: 300000 });
          if (res.data && res.data.status === 'ready') {
            const arr = res.data.data || [];
            count += arr.length;
            if (arr.length > 0) {
              let chunkStr = JSON.stringify(arr);
              chunkStr = chunkStr.substring(1, chunkStr.length - 1);
              allDataChunks.push(chunkStr);
            }
            hasMore = res.data.hasMore;
            start = res.data.nextStart || (start + limit);
            res.data = null;
          } else {
            throw new Error(res.data ? res.data.message : 'Unknown GAS error');
          }
        }
        return { count, chunks: allDataChunks };
      };

      const receiveData = await fetchPaged('receive');
      const changeData = await fetchPaged('change');
      const checkData = await fetchPaged('check');

      console.log('  - กำลังดึงข้อมูล Master (รถ/GPS)...');
      const masterRes = await axios.get(`${gasUrl.trim()}?type=master`, { timeout: 300000 });
      if (!masterRes.data || masterRes.data.status !== 'ready') throw new Error('Failed to fetch Master');
      const truckDataRaw = masterRes.data.truckDataRaw;
      const gpsDataRaw = masterRes.data.gpsDataRaw;

      const truckMetadata = extractMetadataFromRaw(truckDataRaw, gpsDataRaw);

      console.log(`🎉 ดึงข้อมูลผ่าน GAS สำเร็จ 100%! เปลี่ยนยาง: ${changeData.count} | ตรวจเช็ค: ${checkData.count} | รับยาง: ${receiveData.count} | รถ: ${Object.keys(truckMetadata).length}`);

      return {
        receiveChunks: receiveData.chunks,
        changeChunks: changeData.chunks,
        checkChunks: checkData.chunks,
        receiveCount: receiveData.count,
        changeCount: changeData.count,
        checkCount: checkData.count,
        gpsDataString: '[]',
        truckDataString: JSON.stringify(truckMetadata),
        truckCount: Object.keys(truckMetadata).length,
        lastUpdated: new Date().toISOString(),
        useChunks: true
      };
    } catch (err) {
      console.warn('⚠️ การดึงข้อมูลผ่าน GAS ล้มเหลว สลับไปใช้วิธีดาวน์โหลด XLSX:', err.message);
    }
  }
  throw new Error('GAS_WEB_APP_URL not configured');
}

// ฟังก์ชันใหม่: เขียนข้อมูลตรงเข้า gzip stream ทีละหน้า ไม่เก็บไว้ใน RAM
async function fetchAllDataStreaming(gzipStream) {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  if (!gasUrl || gasUrl.trim() === '') {
    throw new Error('GAS_WEB_APP_URL not configured');
  }

  console.log('🔄 เริ่มดึงข้อมูลผ่าน GAS (Streaming Mode)...');

  const stats = { changeCount: 0, checkCount: 0, receiveCount: 0, truckCount: 0, lastUpdated: null };

  // ฟังก์ชันดึงข้อมูลทีละหน้าแล้ว write ลง stream เลย
  const fetchPagedStream = async (type, isFirst) => {
    let start = 1;
    const limit = 10000;
    let hasMore = true;
    let count = 0;
    let firstPageOfType = true;

    while (hasMore) {
      console.log(`  - กำลังดึงข้อมูล ${type} (เริ่มบรรทัดที่ ${start})...`);
      const url = `${gasUrl.trim()}?type=${type}&start=${start}&limit=${limit}`;
      const res = await axios.get(url, { timeout: 300000 });

      if (res.data && res.data.status === 'ready') {
        const arr = res.data.data || [];
        count += arr.length;

        if (arr.length > 0) {
          let chunkStr = JSON.stringify(arr);
          // ตัด [ และ ] ออก เพื่อเอาแค่ข้อมูลข้างใน
          chunkStr = chunkStr.substring(1, chunkStr.length - 1);

          if (!firstPageOfType) {
            // หน้าถัดไปของ type เดิม ต้องใส่ comma คั่น
            gzipStream.write(',');
          }
          gzipStream.write(chunkStr);
          firstPageOfType = false;
        }

        hasMore = res.data.hasMore;
        start = res.data.nextStart || (start + limit);
        res.data = null; // คืน RAM ทันที
      } else {
        throw new Error(res.data ? res.data.message : `Unknown GAS error for type ${type}`);
      }
    }
    return count;
  };

  // เขียน JSON structure ทีละส่วน พร้อมดึงข้อมูลไปด้วย
  gzipStream.write('{"changeData":[');
  stats.changeCount = await fetchPagedStream('change');

  gzipStream.write('],"checkData":[');
  stats.checkCount = await fetchPagedStream('check');

  gzipStream.write('],"receiveData":[');
  stats.receiveCount = await fetchPagedStream('receive');

  // ดึง Master data
  console.log('  - กำลังดึงข้อมูล Master (รถ/GPS)...');
  const masterRes = await axios.get(`${gasUrl.trim()}?type=master`, { timeout: 300000 });
  if (!masterRes.data || masterRes.data.status !== 'ready') throw new Error('Failed to fetch Master');
  const truckMetadata = extractMetadataFromRaw(masterRes.data.truckDataRaw, masterRes.data.gpsDataRaw);
  masterRes.data = null;

  stats.truckCount = Object.keys(truckMetadata).length;
  stats.lastUpdated = new Date().toISOString();

  gzipStream.write('],"gpsData":[]');
  gzipStream.write(`,"truckData":${JSON.stringify(truckMetadata)}`);
  gzipStream.write(`,"lastUpdated":"${stats.lastUpdated}"}`);
  gzipStream.end();

  console.log(`🎉 Streaming สำเร็จ! เปลี่ยนยาง: ${stats.changeCount} | ตรวจเช็ค: ${stats.checkCount} | รับยาง: ${stats.receiveCount} | รถ: ${stats.truckCount}`);
  return stats;
}

module.exports = { fetchAllData, fetchAllDataStreaming };