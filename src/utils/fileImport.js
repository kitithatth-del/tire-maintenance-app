// ============================================================
// fileImport.js — Excel (.xlsx) and CSV parser
// Maps spreadsheet columns A–AH to internal field names
// ============================================================
import * as XLSX from 'xlsx';
import { normalizeTruckId } from './dataParser';

// We will dynamically map columns based on header row
const buildDynamicColumnMap = (rawRows) => {
  // Find the header row (usually row 0 or 1). We look for 'วันที่บันทึก' or 'เบอร์รถ'
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const rowStr = (rawRows[i] || []).join('');
    if (rowStr.includes('วันที่บันทึก') || rowStr.includes('เบอร์รถ')) {
      headerRowIdx = i;
      break;
    }
  }
  
  const headers = rawRows[headerRowIdx] || [];
  const map = {};
  let tireCount = 0;
  
  for (let i = 0; i < headers.length; i++) {
    const colName = String(headers[i] || '').trim();
    if (!colName) continue;
    
    if (colName === 'MM') map[i] = 'MM';
    else if (colName === 'YYYY') map[i] = 'YYYY';
    else if (colName.includes('วันที่บันทึก')) map[i] = 'วันที่บันทึก';
    else if (colName.includes('ศูนย์บริการ')) map[i] = 'ศูนย์บริการ';
    else if (colName.includes('ชื่อผู้บันทึก')) map[i] = 'ชื่อผู้บันทึก';
    else if (colName.includes('ประเภทแบบฟอร์ม')) map[i] = 'ประเภทแบบฟอร์ม';
    else if (colName.includes('วันที่ติดตั้ง')) map[i] = 'วันที่ติดตั้ง';
    else if (colName.includes('วันที่อัปเดต')) map[i] = 'วันที่อัปเดต';
    else if (colName.includes('เลขไมล์ติดตั้ง')) map[i] = 'เลขไมล์ติดตั้ง';
    else if (colName === 'เบอร์รถ' || colName.includes('เบอร์รถ') || colName.toUpperCase() === 'NO' || colName.toUpperCase() === 'NO.') map[i] = 'เบอร์รถ';
    else if (colName.includes('ทะเบียนหัว')) map[i] = 'ทะเบียนหัว';
    else if (colName.includes('ทะเบียนหาง')) map[i] = 'ทะเบียนหาง';
    else if (colName.includes('สังกัดรถ')) map[i] = 'สังกัดรถ';
    else if (colName.includes('ตำแหน่ง') && colName.includes('ล้อยาง')) map[i] = 'ตำแหน่งล้อยาง';
    
    // Duplicate columns (IN vs OUT)
    else if (colName.includes('หมายเลขยาง')) {
      tireCount++;
      map[i] = tireCount === 1 ? 'หมายเลขยาง_เข้า' : 'หมายเลขยาง_ออก';
    }
    else if (colName === 'D1' || colName === 'D1(out)' || colName === 'D1_เข้า' || colName === 'D1_ออก') map[i] = tireCount === 1 || colName.includes('เข้า') ? 'D1_เข้า' : 'D1_ออก';
    else if (colName === 'D2' || colName === 'D2(out)' || colName === 'D2_เข้า' || colName === 'D2_ออก') map[i] = tireCount === 1 || colName.includes('เข้า') ? 'D2_เข้า' : 'D2_ออก';
    else if (colName === 'D3' || colName === 'D3(out)' || colName === 'D3_เข้า' || colName === 'D3_ออก') map[i] = tireCount === 1 || colName.includes('เข้า') ? 'D3_เข้า' : 'D3_ออก';
    else if (colName === 'D4' || colName === 'D4(out)' || colName === 'D4_เข้า' || colName === 'D4_ออก') map[i] = tireCount === 1 || colName.includes('เข้า') ? 'D4_เข้า' : 'D4_ออก';
    else if (colName.includes('ชนิด/ขนาดยาง') || colName.includes('ยี่ห้อ/ขนาด')) map[i] = tireCount === 1 ? 'ชนิด/ขนาดยาง_เข้า' : 'ชนิด/ขนาดยาง_ออก';
    
    else if (colName.includes('แรงดันก่อน')) map[i] = 'แรงดันก่อน';
    else if (colName.includes('แรงดันหลัง')) map[i] = 'แรงดันหลัง';
    else if (colName.includes('สาเหตุที่ถอด') || colName.includes('เหตุผลที่ถอด')) map[i] = 'สาเหตุที่ถอด';
    else if (colName.includes('สถานะยางออก')) map[i] = 'สถานะยางออก';
    else if (colName === 'หมายเหตุ' || colName.includes('หมายเหตุ')) map[i] = 'หมายเหตุ';
    else if (colName.includes('ใบแจ้งซ่อม')) map[i] = 'ใบแจ้งซ่อม';
    else if (colName.includes('ใบเบิกยาง') || colName.includes('WMS')) map[i] = 'ใบเบิกยาง';
  }
  
  return { columnMap: map, dataStartIndex: headerRowIdx + 1 };
};

// Fields that should be numbers
const NUMERIC_FIELDS = new Set([
  'MM', 'YYYY', 'เลขไมล์ติดตั้ง',
  'D1_เข้า', 'D2_เข้า', 'D3_เข้า', 'D4_เข้า',
  'D1_ออก', 'D2_ออก', 'D3_ออก', 'D4_ออก',
  'แรงดันก่อน', 'แรงดันหลัง',
]);

// Convert Excel serial date to DD/MM/YYYY string if needed
const convertExcelDate = (value) => {
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 40000 && numValue < 300000) {
    const date = XLSX.SSF.parse_date_code(numValue);
    if (date) {
      const d = String(date.d).padStart(2, '0');
      const m = String(date.m).padStart(2, '0');
      return `${d}/${m}/${date.y}`;
    }
  }
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${value.getFullYear()}`;
  }
  
  // If it's a string, try to normalize it to DD/MM/YYYY
  const str = String(value ?? '').trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      // If second part is > 12, it's M/D/YY (e.g. 7/13/23)
      if (Number(parts[1]) > 12) {
         const m = String(parts[0]).padStart(2, '0');
         const d = String(parts[1]).padStart(2, '0');
         const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
         return `${d}/${m}/${y}`;
      }
      // Otherwise, assume it's already D/M/Y
      const d = String(parts[0]).padStart(2, '0');
      const m = String(parts[1]).padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${d}/${m}/${y}`;
    }
  }
  return str;
};

// Map a raw row array (values by column index) to a data object
const mapRowToObject = (rowArray, columnMap) => {
  const obj = {};
  for (let i = 0; i < rowArray.length; i++) {
    const fieldName = columnMap[i];
    if (!fieldName) continue;
    let val = rowArray[i] ?? null;
    if (val === '' || val === undefined) val = null;

    // Handle date fields
    if (fieldName === 'วันที่บันทึก' || fieldName === 'วันที่ติดตั้ง' || fieldName === 'วันที่อัปเดต') {
      val = val !== null ? convertExcelDate(val) : null;
    }
    // Handle numeric fields
    else if (NUMERIC_FIELDS.has(fieldName)) {
      val = val !== null ? (isNaN(Number(val)) ? null : Number(val)) : null;
    }
    // String fields — just trim
    else if (val !== null) {
      val = String(val).trim() || null;
      if (val && fieldName.includes('หมายเลขยาง')) {
        val = val.replace(/\s+/g, '').toUpperCase();
      }
    }

    obj[fieldName] = val;
  }
  
  // Extract MM and YYYY from วันที่บันทึก if they are missing
  if (!obj.MM || !obj.YYYY) {
    if (obj['วันที่บันทึก']) {
      const parts = obj['วันที่บันทึก'].split('/');
      if (parts.length === 3) {
        obj.MM = String(Number(parts[1])); // Drop leading zero for consistency if needed, but keeping original format is fine
        obj.YYYY = parts[2];
      }
    } else if (obj['วันที่ติดตั้ง']) {
      const parts = obj['วันที่ติดตั้ง'].split('/');
      if (parts.length === 3) {
        obj.MM = String(Number(parts[1]));
        obj.YYYY = parts[2];
      }
    }
  }

  return obj;
};

// Validate that a row has minimum required fields
const isValidRow = (obj) => {
  return obj['เบอร์รถ'] !== null;
};

// ============================================================
// Extract Truck and GPS Metadata from specialized sheets
// ============================================================
const extractTruckMetadata = (workbook) => {
  const metadata = {}; // { [truckNo]: { gpsStatus, gpsLocation, truckStatus, plate, truckType } }
  const plateToTruck = {}; // { [plate]: truckNo }
  const plateToTruckType = {}; // { [plate]: truckType string }

  const getSheet = (possibleNames) => {
    const sheetName = Object.keys(workbook.Sheets).find(k => {
      const normalized = k.trim().replace(/\s+/g, '').toLowerCase();
      return possibleNames.some(n => normalized.includes(n));
    });
    return sheetName ? workbook.Sheets[sheetName] : null;
  };

  // 1. Parse 'Data รถ'
  const dataSheet = getSheet(['dataรถ', 'ข้อมูลรถ']);
  if (dataSheet) {
    const rawRows = XLSX.utils.sheet_to_json(dataSheet, { header: 1, raw: true, defval: null });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => c && ['เบอร์รถ', 'สถานะรถ', 'ทะเบียนรถ'].includes(String(c).replace(/\s+/g, '')))) {
        headerIdx = i; break;
      }
    }
    // Ultimate fallback: if no header row is identified, assume row 1 (the 2nd row) is the header row
    if (headerIdx === -1 && rawRows.length > 1) {
      headerIdx = 1;
    }

    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const getIdx = (name) => headers.findIndex(c => c && String(c).replace(/\s+/g, '') === name);
      
      const truckNoIdx = 96; // Hardcoded to Column CS (0-indexed 96) as requested by user
      const plateIdx = getIdx('ทะเบียนรถ') !== -1 ? getIdx('ทะเบียนรถ') : headers.findIndex(c => c && String(c).replace(/\s+/g, '').includes('ทะเบียน'));
      const statusIdx = getIdx('สถานะรถ') !== -1 ? getIdx('สถานะรถ') : headers.findIndex(c => c && String(c).replace(/\s+/g, '').includes('สถานะ'));
      const typeIdx = getIdx('ประเภทรถ') !== -1 ? getIdx('ประเภทรถ') : headers.findIndex(c => c && String(c).match(/ประเภท|ชนิด|ลักษณะ/));
      
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[truckNoIdx]) continue;
        const rawTruckNo = String(row[truckNoIdx]).trim();
        const truckNo = normalizeTruckId(rawTruckNo) || rawTruckNo;
        const plate = row[plateIdx] ? String(row[plateIdx]).trim() : null;
        const status = row[statusIdx] ? String(row[statusIdx]).trim() : null;
        const type = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : '';
        
        if (!metadata[rawTruckNo]) metadata[rawTruckNo] = {};
        if (truckNo !== rawTruckNo && !metadata[truckNo]) {
            metadata[truckNo] = metadata[rawTruckNo];
        }
        
        const isBackup = row.some(cell => cell && (String(cell).includes('สำรอง') || String(cell).includes('Tหาง') || String(cell).includes('หางสำรอง')));
        // Prioritize status if type is 'หัวลาก' or 'กึ่งพ่วง', AND it's not a backup (สำรอง)
        const isPrimaryType = (type.includes('หัวลาก') || type.includes('กึ่งพ่วง')) && !isBackup;
        
        if (status && (isPrimaryType || !metadata[truckNo].truckStatus)) {
          // If we already have a status and this is a backup truck, don't overwrite
          if (!(metadata[truckNo].truckStatus && isBackup)) {
             metadata[truckNo].truckStatus = status;
          }
        }

        if (plate && (isPrimaryType || !metadata[truckNo].plate)) {
          if (!(metadata[truckNo].plate && isBackup)) {
             metadata[truckNo].plate = plate;
             plateToTruck[plate.replace(/[^0-9]/g, '')] = truckNo;
             plateToTruck[plate] = truckNo;
          }
        }

        // Store truckType from 'ประเภทรถ' column
        if (type && (isPrimaryType || !metadata[truckNo].truckType)) {
          if (!(metadata[truckNo].truckType && isBackup)) {
            metadata[truckNo].truckType = type;
            if (plate) plateToTruckType[plate] = type;
          }
        }
      }
    }
  }

  // 2. Parse 'GPS สถานที่ปัจจุบัน'
  const gpsSheet = getSheet(['gps', 'สถานที่ปัจจุบัน']);
  if (gpsSheet) {
    const rawRows = XLSX.utils.sheet_to_json(gpsSheet, { header: 1, raw: true, defval: null });
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

        // Always try Column A first for truck number
        let targetTruckNo = (row[0] !== null && row[0] !== undefined && String(row[0]).trim() !== '')
          ? String(row[0]).trim()
          : null;

        // Extract status and location from named columns
        const status = (statusIdx !== -1 && row[statusIdx]) ? String(row[statusIdx]).trim() : null;
        const loc = (locIdx !== -1 && row[locIdx]) ? String(row[locIdx]).trim() : null;
        const timeVal = (timeIdx !== -1 && row[timeIdx]) ? row[timeIdx] : null;
        
        let timeStr = null;
        if (timeVal) {
           timeStr = convertExcelDate(timeVal); // Try to format it if it's an Excel date, or it'll just be a string
           // Wait, convertExcelDate might only do DD/MM/YYYY, what about time?
           // If it's an Excel serial date with time (e.g. 45000.5), convertExcelDate currently drops the time!
           // Let's just convert it as string, or enhance if it's an Excel date.
           // Since time is usually string from GPS systems or we can just use string.
           // Actually, let's just do String(timeVal).trim() for now unless we need Excel date conversion.
        }

        // Fallback: try to match via license plate column
        if (!targetTruckNo && row[tabienIdx]) {
          const tabienStr = String(row[tabienIdx]).trim();
          let plate = null;
          const match = tabienStr.match(/\(([^)]+)\)/);
          if (match) {
            plate = match[1].trim();
          } else {
            plate = tabienStr;
          }
          targetTruckNo = plateToTruck[plate] || plateToTruck[plate.replace(/[^0-9]/g, '')] || null;

          if (!targetTruckNo) {
            const noMatch = tabienStr.match(/No\.?0*([0-9]+)/i) || tabienStr.match(/^0*([0-9A-Za-z]+)/);
            if (noMatch) {
              const fallbackNo = noMatch[1];
              targetTruckNo = Object.keys(metadata).find(k => String(k).trim().toLowerCase() === fallbackNo.toLowerCase()) || null;
            }
          }
        }

        if (targetTruckNo) {
          if (!metadata[targetTruckNo]) metadata[targetTruckNo] = {};
          if (status) metadata[targetTruckNo].gpsStatus = status;
          if (loc) metadata[targetTruckNo].gpsLocation = loc;
          
          if (timeVal) {
             let formattedTime = String(timeVal).trim();
             if (typeof timeVal === 'number' && timeVal > 40000) {
                 const date = XLSX.SSF.parse_date_code(timeVal);
                 if (date) {
                    const d = String(date.d).padStart(2, '0');
                    const m = String(date.m).padStart(2, '0');
                    const h = String(date.H).padStart(2, '0');
                    const min = String(date.M).padStart(2, '0');
                    formattedTime = `${d}/${m}/${date.y} ${h}:${min}`;
                 }
             }
             metadata[targetTruckNo].gpsTime = formattedTime;
          }
        }
      }

    }
  }

  return { metadata, plateToTruck, plateToTruckType };
};

// ============================================================
// Extract Tire Metadata (Brand mapping from 'รับยางเข้า')
// ============================================================
const extractTireMetadata = (workbook) => {
  const tireBrandMap = {}; // { [tireNo]: brand }
  
  const getSheet = (possibleNames) => {
    const sheetName = Object.keys(workbook.Sheets).find(k => {
      const normalized = k.trim().replace(/\s+/g, '').toLowerCase();
      return possibleNames.some(n => normalized.includes(n));
    });
    return sheetName ? workbook.Sheets[sheetName] : null;
  };

  const sheet = getSheet(['รับยางเข้า']);
  if (sheet) {
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      if (rawRows[i] && rawRows[i].some(c => c && String(c).replace(/\s+/g, '') === 'หมายเลขยาง')) {
        headerIdx = i; break;
      }
    }
    
    if (headerIdx !== -1) {
      const headers = rawRows[headerIdx];
      const tireNoIdx = headers.findIndex(c => c && String(c).replace(/\s+/g, '') === 'หมายเลขยาง');
      const brandIdx = headers.findIndex(c => c && String(c).replace(/\s+/g, '') === 'ยี่ห้อยาง');
      const sizeIdx = headers.findIndex(c => c && String(c).replace(/\s+/g, '') === 'ขนาดยาง');
      
      if (tireNoIdx !== -1) {
        for (let i = headerIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[tireNoIdx]) continue;
          
          const tireNo = String(row[tireNoIdx]).replace(/\s+/g, '').toUpperCase();
          const brand = brandIdx !== -1 && row[brandIdx] ? String(row[brandIdx]).trim() : null;
          const size = sizeIdx !== -1 && row[sizeIdx] ? String(row[sizeIdx]).trim() : null;
          
          if (tireNo) {
            tireBrandMap[tireNo] = { brand, size };
          }
        }
      }
    }
  }
  
  return tireBrandMap;
};

// ============================================================
// Parse Excel file (.xlsx / .xls)
// Row 1 = group headers, Row 2 = column names, Row 3+ = data
// ============================================================
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const parsed = [];
        const errors = [];
        let totalRows = 0;

        const { metadata: truckMetadata, plateToTruck, plateToTruckType } = extractTruckMetadata(workbook);
        const tireBrandMap = extractTireMetadata(workbook);
        const rawPreviews = {};

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: true,
            defval: null,
          });

          if (rawRows.length > 0) {
            rawPreviews[sheetName] = rawRows.slice(0, 5);
          }

          // Skip the specialized data sheets when parsing tire data
          const normalizedSheetName = sheetName.replace(/\s+/g, '').toLowerCase();
          if (normalizedSheetName === 'dataรถ' || normalizedSheetName === 'gpsสถานที่ปัจจุบัน' || normalizedSheetName.includes('รับยางเข้า')) return;

          if (rawRows.length < 2) return;

          const { columnMap, dataStartIndex } = buildDynamicColumnMap(rawRows);
          const dataRows = rawRows.slice(dataStartIndex);
          totalRows += dataRows.length;

          dataRows.forEach((row, idx) => {
            if (!row || row.every(v => v === null || v === '')) return; // skip empty rows
            try {
              const obj = mapRowToObject(row, columnMap);
              if (isValidRow(obj)) {
                obj._sheet = sheetName; // track source sheet
                
                // Inject tire brand and size if available
                if (obj['หมายเลขยาง_เข้า'] && tireBrandMap[obj['หมายเลขยาง_เข้า']]) {
                  obj['ยี่ห้อยาง_เข้า'] = tireBrandMap[obj['หมายเลขยาง_เข้า']].brand;
                  obj['ขนาดยาง_รับเข้า_เข้า'] = tireBrandMap[obj['หมายเลขยาง_เข้า']].size;
                }
                if (obj['หมายเลขยาง_ออก'] && tireBrandMap[obj['หมายเลขยาง_ออก']]) {
                  obj['ยี่ห้อยาง_ออก'] = tireBrandMap[obj['หมายเลขยาง_ออก']].brand;
                  obj['ขนาดยาง_รับเข้า_ออก'] = tireBrandMap[obj['หมายเลขยาง_ออก']].size;
                }

                // Inject head/tail truck type from Data รถ via plate lookup
                const headPlate = obj['ทะเบียนหัว'];
                const tailPlate = obj['ทะเบียนหาง'];
                if (headPlate) {
                  const headNo = plateToTruck[headPlate] || plateToTruck[headPlate.replace(/[^0-9]/g, '')];
                  if (headNo) obj['_headTruckNo'] = headNo;
                  obj['_headTruckType'] = plateToTruckType[headPlate] || null;
                }
                if (tailPlate) {
                  const tailNo = plateToTruck[tailPlate] || plateToTruck[tailPlate.replace(/[^0-9]/g, '')];
                  if (tailNo) obj['_tailTruckNo'] = tailNo;
                  obj['_tailTruckType'] = plateToTruckType[tailPlate] || null;
                }

                parsed.push(obj);
              }
            } catch (err) {
              errors.push({ sheet: sheetName, row: idx + dataStartIndex + 1, error: err.message });
            }
          });
        });

        resolve({ data: parsed, truckMetadata, rawPreviews, errors, source: 'excel', fileName: file.name, totalRows });
      } catch (err) {
        reject(new Error(`ไม่สามารถอ่านไฟล์ Excel ได้: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsArrayBuffer(file);
  });
};

// ============================================================
// Parse CSV text string (used by both file upload and Google Sheet fetch)
// ============================================================
export const parseCsvText = (text, fileName, source) => {
  try {
    // Use SheetJS to parse CSV for consistent handling
    const workbook = XLSX.read(text, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    const { columnMap, dataStartIndex } = buildDynamicColumnMap(rawRows);

    const dataRows = rawRows.slice(dataStartIndex);
    const parsed = [];
    const errors = [];

    dataRows.forEach((row, idx) => {
      if (!row || row.every(v => v === null || v === '')) return;
      try {
        const obj = mapRowToObject(row, columnMap);
        if (isValidRow(obj)) parsed.push(obj);
      } catch (err) {
        errors.push({ row: idx + dataStartIndex + 1, error: err.message });
      }
    });

    return { data: parsed, errors, source, fileName, totalRows: dataRows.length };
  } catch (err) {
    throw new Error(`ไม่สามารถอ่านข้อมูลได้: ${err.message}`);
  }
};

// ============================================================
// Parse CSV file
// Assumes: Row 1 = group headers, Row 2 = column names, Row 3+ = data
// ============================================================
export const parseCsvFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = parseCsvText(text, file.name, 'csv');
        resolve(result);
      } catch (err) {
        reject(new Error(`ไม่สามารถอ่านไฟล์ CSV ได้: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsText(file, 'utf-8');
  });
};

// ============================================================
// Fetch data from a public Google Sheet URL
// ============================================================
export const fetchGoogleSheet = async (url) => {
  try {
    // Extract Spreadsheet ID from URL
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('URL ไม่ถูกต้อง โปรดคัดลอกลิงก์จากหน้า Google Sheets มาวาง');
    }
    
    const sheetId = match[1];
    const tabName = encodeURIComponent('ข้อมูลเปลี่ยนยาง');
    // Construct Google Visualization API URL for CSV export of a specific sheet name
    const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${tabName}`;
    
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบว่าไฟล์เปิดแชร์แบบ "ทุกคนที่มีลิงก์ (Anyone with the link)"');
    }
    
    const csvText = await response.text();
    
    // The gviz API returns an HTML page if there is an error (e.g. not found, no permission)
    if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.trim().toLowerCase().startsWith('<html')) {
      throw new Error('ไม่พบข้อมูล หรือไม่มีสิทธิ์เข้าถึง โปรดตรวจสอบการแชร์ไฟล์ หรือตรวจว่ามีแท็บชื่อ "ข้อมูลเปลี่ยนยาง" หรือไม่');
    }

    const shortId = sheetId.substring(0, 8) + '...';
    return parseCsvText(csvText, `Google Sheet (${shortId})`, 'google-sheet');
  } catch (error) {
    throw new Error(error.message);
  }
};

// ============================================================
// Auto-detect file type and parse
// ============================================================
export const parseFile = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return parseExcelFile(file);
  if (ext === 'csv') return parseCsvFile(file);
  return Promise.reject(new Error(`ไม่รองรับไฟล์นามสกุล .${ext} (รองรับ .xlsx, .xls, .csv เท่านั้น)`));
};
