/**
 * requisitionUtils.js
 * ฟังก์ชันคำนวณข้อมูลการขออนุมัติเบิกยาง
 */

// แปลง Excel serial date หรือ string เป็น Date
function parseExcelDate(val) {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 100000) {
    return new Date((num - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toADYear(year) {
  const y = Number(year);
  if (!y) return y;
  return y > 2500 ? y - 543 : y;
}

/**
 * ปรับไมล์ติดตั้งให้อยู่ในสเกลเดียวกับเลขไมล์ยกมา
 * บวก 1,000,000 ซ้ำๆ จนกว่า (installMile + 1M) > currentMile
 */
function adjustInstallMile(installMile, currentMile) {
  if (!installMile || !currentMile || currentMile <= 0) return installMile;
  let adjusted = Number(installMile);
  while (adjusted + 1000000 <= currentMile) {
    adjusted += 1000000;
  }
  return adjusted;
}

/**
 * ระบุว่ายางแท้หรือหล่อดอก
 * ถ้ามี '/' ในหมายเลขยาง = หล่อดอก, ไม่มี = ยางแท้
 */
function getTireType(tireNumber) {
  if (!tireNumber) return 'ยางแท้';
  return String(tireNumber).includes('/') ? 'หล่อดอก' : 'ยางแท้';
}

/**
 * สร้างข้อมูลรายงานการขออนุมัติเบิกยาง
 */
export function buildRequisitionData(rawData, fuelData, selectedMonth, selectedYear, selectedCenter) {
  if (!rawData || !selectedMonth || !selectedYear) return [];

  const targetDate = new Date(toADYear(selectedYear), Number(selectedMonth), 0, 23, 59, 59);

  const changeRows = rawData.filter(r => r._sheet === 'เปลี่ยนยาง');
  const checkRows = rawData.filter(r => r._sheet === 'ตรวจเช็ค');

  // สร้าง map เลขไมล์จาก fuelData
  const fuelMap = {};
  (fuelData || []).forEach(f => {
    if (!f.truckNo) return;
    const fMonth = Number(f.month);
    const fYear = toADYear(f.year);
    if (fMonth === Number(selectedMonth) && fYear === toADYear(selectedYear)) {
      fuelMap[String(f.truckNo).trim()] = {
        mileCarryForward: Number(f.mileCarryForward) || 0,
        mileEnd: Number(f.mileEnd) || 0,
        center: f.center || '',
        truckType: f.truckType || '',
      };
    }
  });

  // หายางที่กำลังติดตั้ง ณ เดือนที่เลือก
  const positionMap = {};

  // เรียงลำดับข้อมูลเปลี่ยนยางตามวันที่ติดตั้ง เพื่อให้สามารถคำนวณการถอด-ใส่ยางได้ถูกต้องตามลำดับเวลา
  const sortedChangeRows = [...changeRows].sort((a, b) => {
    const dA = parseExcelDate(a['วันที่ติดตั้ง'] || a['วันที่บันทึก']) || new Date(0);
    const dB = parseExcelDate(b['วันที่ติดตั้ง'] || b['วันที่บันทึก']) || new Date(0);
    return dA - dB;
  });

  sortedChangeRows.forEach(row => {
    const truck = String(row['เบอร์รถ'] || '').trim();
    const position = String(row['ตำแหน่งล้อยาง'] || '').trim();
    const tireIn = String(row['หมายเลขยาง_เข้า'] || '').trim();
    if (!truck || !position || !tireIn || tireIn === 'null') return;

    const installDateRaw = row['วันที่ติดตั้ง'] || row['วันที่บันทึก'];
    const rowDate = parseExcelDate(installDateRaw);
    if (!rowDate || rowDate > targetDate) return;

    const key = `${truck}|${position}`;
    const existing = positionMap[key];

    // ถ้ามีการเอายางออก (และเป็นยางเส้นเดียวกับที่อยู่บนรถตอนนี้) ให้ถอดยางนั้นออกก่อน
    const tireOut = String(row['หมายเลขยาง_ออก'] || '').trim();
    if (tireOut && tireOut !== 'null' && existing && existing.tireNumber === tireOut) {
       // ถ้ายางออกเกิดขึ้นหลังจากวันที่ติดตั้งยางที่มีอยู่ ให้ถอดออก
       if (rowDate >= existing.installDate) {
         delete positionMap[key];
       }
    }

    if (!tireIn || tireIn === 'null') return; // ถ้าไม่มียางเข้า ให้ข้ามไป (เป็นการถอดอย่างเดียว)

    // เอายางเข้าใส่แทน
    if (!positionMap[key] || rowDate > positionMap[key].installDate) {
      positionMap[key] = {
        truck,
        position,
        tireNumber: tireIn,
        tireType: getTireType(tireIn),
        tireSize: row['ชนิด/ขนาดยาง_เข้า'] || '',
        installDate: rowDate,
        installMileRaw: Number(row['เลขไมล์ติดตั้ง']) || 0,
        center: row['ศูนย์บริการ'] || '',
        unit: row['สังกัดรถ'] || '',
        d1Inst: Number(row['D1_เข้า']) || 0,
        d2Inst: Number(row['D2_เข้า']) || 0,
        d3Inst: Number(row['D3_เข้า']) || 0,
        d4Inst: Number(row['D4_เข้า']) || 0,
      };
    }
  });

  // ดอกยางล่าสุดของแต่ละยาง ≤ targetDate
  const latestTreadMap = {};

  const updateTread = (tireNumber, date, d1, d2, d3, d4, source) => {
    if (!tireNumber || tireNumber === 'null') return;
    const existing = latestTreadMap[tireNumber];
    if (!existing || date > existing.date) {
      latestTreadMap[tireNumber] = { date, d1, d2, d3, d4, source };
    }
  };

  checkRows.forEach(row => {
    const tireNum = String(row['หมายเลขยาง_เข้า'] || '').trim();
    if (!tireNum || tireNum === 'null') return;
    const checkDate = parseExcelDate(row['วันที่บันทึก'] || row['วันที่อัปเดต']);
    if (!checkDate || checkDate > targetDate) return;
    updateTread(tireNum, checkDate,
      Number(row['D1_เข้า']) || 0, Number(row['D2_เข้า']) || 0,
      Number(row['D3_เข้า']) || 0, Number(row['D4_เข้า']) || 0, 'check');
  });

  changeRows.forEach(row => {
    const tireNum = String(row['หมายเลขยาง_เข้า'] || '').trim();
    if (!tireNum || tireNum === 'null') return;
    if (latestTreadMap[tireNum]?.source === 'check') return;
    const d = parseExcelDate(row['วันที่บันทึก']);
    if (!d || d > targetDate) return;
    updateTread(tireNum, d,
      Number(row['D1_เข้า']) || 0, Number(row['D2_เข้า']) || 0,
      Number(row['D3_เข้า']) || 0, Number(row['D4_เข้า']) || 0, 'change');
  });

  // Build result rows
  const rows = [];

  Object.values(positionMap).forEach(tire => {
    if (selectedCenter && tire.unit !== selectedCenter) return;

    const tread = latestTreadMap[tire.tireNumber];
    const d1 = tread ? (tread.d1 || 0) : tire.d1Inst;
    const d2 = tread ? (tread.d2 || 0) : tire.d2Inst;
    const d3 = tread ? (tread.d3 || 0) : tire.d3Inst;
    const d4 = tread ? (tread.d4 || 0) : tire.d4Inst;
    const validDs = [d1, d2, d3, d4].filter(v => v > 0);
    const avgTread = validDs.length > 0 ? validDs.reduce((a, b) => a + b, 0) / validDs.length : 0;

    const fuelInfo = fuelMap[tire.truck] || null;
    const currentMile = fuelInfo ? fuelInfo.mileCarryForward : 0;
    const adjustedInstallMile = currentMile > 0 ? adjustInstallMile(tire.installMileRaw, currentMile) : tire.installMileRaw;
    const distanceDriven = currentMile > 0 ? Math.max(0, currentMile - adjustedInstallMile) : 0;
    const mmUsed = Math.max(0, 14 - avgTread);
    const kmPerMm = mmUsed > 0 && distanceDriven > 0 ? distanceDriven / mmUsed : 0;
    const expectedKm = kmPerMm > 0 ? kmPerMm * 14 : 0;

    rows.push({
      truck: tire.truck,
      position: Number(tire.position) || 0,
      tireNumber: tire.tireNumber,
      tireType: tire.tireType,
      isNew: tire.tireType === 'ยางแท้' ? 1 : 0,
      isRetreaded: tire.tireType === 'หล่อดอก' ? 1 : 0,
      d1, d2, d3, d4,
      avgTread: Math.round(avgTread * 100) / 100,
      currentMile,
      prevMile: fuelInfo ? fuelInfo.mileEnd : 0,
      installMile: adjustedInstallMile,
      distanceDriven,
      mmUsed: Math.round(mmUsed * 100) / 100,
      kmPerMm: Math.round(kmPerMm),
      expectedKm: Math.round(expectedKm),
      tireSize: tire.tireSize,
      center: tire.center,
      unit: tire.unit,
      truckType: fuelInfo ? fuelInfo.truckType : '',
      treadSource: tread ? tread.source : 'install',
    });
  });

  rows.sort((a, b) => {
    const at = String(a.truck);
    const bt = String(b.truck);
    if (at < bt) return -1;
    if (at > bt) return 1;
    return a.position - b.position;
  });

  return rows;
}

/**
 * สร้างข้อมูลกราฟประสิทธิภาพยาง แยกตามยี่ห้อ/ขนาด
 */
export function buildEfficiencyChartData(rows) {
  const groups = {};

  rows.forEach(row => {
    if (!row.tireSize) return;
    const sizeKey = row.tireSize.trim();
    const isTenWheel = !String(row.truckType || '').includes('เทรลเลอร์');

    if (!groups[sizeKey]) {
      groups[sizeKey] = {
        name: sizeKey,
        tenWheelKm: [], tenWheelKmPerMm: [],
        trailerKm: [], trailerKmPerMm: [],
      };
    }

    if (isTenWheel) {
      if (row.distanceDriven > 0) groups[sizeKey].tenWheelKm.push(row.distanceDriven);
      if (row.kmPerMm > 0) groups[sizeKey].tenWheelKmPerMm.push(row.kmPerMm);
    } else {
      if (row.distanceDriven > 0) groups[sizeKey].trailerKm.push(row.distanceDriven);
      if (row.kmPerMm > 0) groups[sizeKey].trailerKmPerMm.push(row.kmPerMm);
    }
  });

  const avg = arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return Object.values(groups).map(g => ({
    name: g.name,
    'สิบล้อ ระยะทางวิ่ง เฉลี่ย(km)': avg(g.tenWheelKm),
    'สิบล้อ ระยะทางวิ่ง เฉลี่ย(km/mm)': avg(g.tenWheelKmPerMm),
    'เทรลเลอร์ ระยะทางวิ่ง เฉลี่ย(km)': avg(g.trailerKm),
    'เทรลเลอร์ ระยะทางวิ่ง เฉลี่ย(km/mm)': avg(g.trailerKmPerMm),
  }));
}

export function getFuelPeriods(fuelData, rawData) {
  // ถ้ามี fuelData → ดึงจาก fuelData
  if (fuelData && fuelData.length > 0) {
    const periods = new Set();
    fuelData.forEach(f => {
      if (f.month && f.year) {
        const y = toADYear(f.year);
        periods.add(`${f.month}|${y}`);
      }
    });
    return Array.from(periods).map(p => {
      const [month, year] = p.split('|');
      return { month: Number(month), year: Number(year), label: `${month}/${Number(year)}` };
    }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }

  // Fallback: ดึงจาก changeData/checkData เมื่อไม่มี fuelData (เช่น บน Render ใช้ GAS)
  const periods = new Set();
  (rawData || [])
    .filter(r => r._sheet === 'เปลี่ยนยาง' && r['Month'] && r['Year'])
    .forEach(r => {
      const m = Number(r['Month']);
      const y = toADYear(Number(r['Year']));
      if (m && y) periods.add(`${m}|${y}`);
    });

  return Array.from(periods).map(p => {
    const [month, year] = p.split('|');
    return { month: Number(month), year: Number(year), label: `${month}/${Number(year)}` };
  }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

export function getRequisitionCenters(rawData) {
  const centers = new Set();
  (rawData || [])
    .filter(r => r._sheet === 'เปลี่ยนยาง' && r['สังกัดรถ'])
    .forEach(r => centers.add(r['สังกัดรถ']));
  return Array.from(centers).sort();
}
