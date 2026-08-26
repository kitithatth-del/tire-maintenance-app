// ============================================================
// dataParser.js — Column Mapping A-AH & Compliance Logic
// ============================================================
// Column Layout:
//   Row 1: Group headers ("ยางเข้า/ตรวจเช็ค" = N-U, "ยางออก" = V-AC)
//   Row 2: Field names (A-AH)
//   Row 3+: Data rows
//
// Field order: MM(A) YYYY(B) วันที่บันทึก(C) ศูนย์บริการ(D) ชื่อผู้บันทึก(E)
//   ประเภทแบบฟอร์ม(F) วันที่ติดตั้ง(G) เลขไมล์ติดตั้ง(H) เบอร์รถ(I)
//   ทะเบียนหัว(J) ทะเบียนหาง(K) สังกัดรถ(L) ตำแหน่งล้อยาง(M)
//   [ยางเข้า N-U]: หมายเลขยาง(N) D1(O) D2(P) D3(Q) D4(R) ชนิด/ขนาด(S) แรงดันก่อน(T) แรงดันหลัง(U)
//   [ยางออก V-AC]: หมายเลขยาง(V) D1(W) D2(X) D3(Y) D4(Z) ชนิด/ขนาด(AA) สาเหตุที่ถอด(AB) สถานะยางออก(AC)
//   หมายเหตุ(AD) ใบแจ้งซ่อม(AE) ใบเบิกยาง/WMS(AF) Month(AG) Month_Year(AH)

export const normalizeTruckId = (t) => {
    if (!t) return '';
    let s = String(t).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 1. หากขึ้นต้นด้วย N ตามด้วยตัวอักษร ให้ตัด N ทิ้ง (เช่น NPTL -> PTL)
    s = s.replace(/^N(?=[A-Z])/, '');
    
    // 2. หากขึ้นต้นด้วย N, T, หรือ W ตามด้วยตัวเลข ให้ตัดตัวอักษรทิ้ง
    s = s.replace(/^[NTW](?=[0-9])/g, '');
    
    // 3. ตัดเลขศูนย์ที่อยู่หน้าสุดทิ้ง (เช่น 062 -> 62)
    s = s.replace(/^0+(?=\d)/, '');
    
    // 4. ตัดเลขศูนย์ที่ตามหลังตัวอักษรทันที (เช่น PTL062 -> PTL62, DEL01 -> DEL1)
    s = s.replace(/([A-Z])0+(?=\d)/g, '$1');
    
    return s;
};

// ============================================================
// Mock Data — 20 rows covering multiple months/scenarios
// ============================================================
export const rawMockData = [
  {
    MM: 4, YYYY: 2023, "วันที่บันทึก": "13/07/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/04/2023",
    "เลขไมล์ติดตั้ง": 2032680, "เบอร์รถ": 239, "ทะเบียนหัว": "71-2390", "ทะเบียนหาง": "72-2391",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 15,
    "หมายเลขยาง_เข้า": "Y2K404306", "D1_เข้า": 14, "D2_เข้า": 14, "D3_เข้า": 14, "D4_เข้า": 14,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35673U", "D1_ออก": 2, "D2_ออก": 2, "D3_ออก": 2, "D4_ออก": 2,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ยางบวม", "สถานะยางออก": "รอขายซาก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "4 Apr", "Month_Year": "4 Apr/2023"
  },
  {
    MM: 4, YYYY: 2023, "วันที่บันทึก": "13/07/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/04/2023",
    "เลขไมล์ติดตั้ง": 2032680, "เบอร์รถ": 239, "ทะเบียนหัว": "71-2390", "ทะเบียนหาง": "72-2391",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": "ยางอะไหล่หัว",
    "หมายเลขยาง_เข้า": "SPARE001", "D1_เข้า": 12, "D2_เข้า": 12, "D3_เข้า": 12, "D4_เข้า": 12,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "SPARE000", "D1_ออก": 2, "D2_ออก": 2, "D3_ออก": 2, "D4_ออก": 2,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ยางบวม", "สถานะยางออก": "รอขายซาก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "4 Apr", "Month_Year": "4 Apr/2023"
  },
  {
    MM: 4, YYYY: 2023, "วันที่บันทึก": "14/07/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "สมชาย", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "15/03/2023",
    "เลขไมล์ติดตั้ง": 2010000, "เบอร์รถ": 240, "ทะเบียนหัว": "71-2400", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 10,
    "หมายเลขยาง_เข้า": "Y2K404307", "D1_เข้า": 13, "D2_เข้า": 13, "D3_เข้า": 13, "D4_เข้า": 13,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35674U", "D1_ออก": 1.5, "D2_ออก": 1.5, "D3_ออก": 1.5, "D4_ออก": 1.5,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "หมดสภาพ", "สถานะยางออก": "รอขายซาก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "4 Apr", "Month_Year": "4 Apr/2023"
  },
  {
    MM: 5, YYYY: 2023, "วันที่บันทึก": "05/08/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "สมหญิง", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "10/04/2023",
    "เลขไมล์ติดตั้ง": 2050000, "เบอร์รถ": 241, "ทะเบียนหัว": "71-2410", "ทะเบียนหาง": "72-2411",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 5,
    "หมายเลขยาง_เข้า": "Y2K404308", "D1_เข้า": 15, "D2_เข้า": 15, "D3_เข้า": 15, "D4_เข้า": 15,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35675U", "D1_ออก": 3.0, "D2_ออก": 3.0, "D3_ออก": 3.0, "D4_ออก": 3.0,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "สลับยาง", "สถานะยางออก": "ใช้งานต่อ",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "5 May", "Month_Year": "5 May/2023"
  },
  {
    MM: 5, YYYY: 2023, "วันที่บันทึก": "12/08/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "วิชัย", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "20/04/2023",
    "เลขไมล์ติดตั้ง": 2070000, "เบอร์รถ": 242, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 2,
    "หมายเลขยาง_เข้า": "Y2K404309", "D1_เข้า": 14.5, "D2_เข้า": 14.5, "D3_เข้า": 14.5, "D4_เข้า": 14.5,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35676U", "D1_ออก": 1.8, "D2_ออก": 1.9, "D3_ออก": 1.8, "D4_ออก": 1.9,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ยางแตก", "สถานะยางออก": "ทิ้ง",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "5 May", "Month_Year": "5 May/2023"
  },
  {
    MM: 6, YYYY: 2023, "วันที่บันทึก": "02/09/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/05/2023",
    "เลขไมล์ติดตั้ง": 2100000, "เบอร์รถ": 239, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 15,
    "หมายเลขยาง_เข้า": "Y2K404310", "D1_เข้า": 14, "D2_เข้า": 14, "D3_เข้า": 14, "D4_เข้า": 14,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35677U", "D1_ออก": 2.5, "D2_ออก": 2.5, "D3_ออก": 2.5, "D4_ออก": 2.5,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ดอกยางเหลือน้อย", "สถานะยางออก": "ส่งหล่อดอก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "6 Jun", "Month_Year": "6 Jun/2023"
  },
  {
    MM: 6, YYYY: 2023, "วันที่บันทึก": "10/09/2023", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "ประยุทธ์", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "05/05/2023",
    "เลขไมล์ติดตั้ง": 1850000, "เบอร์รถ": 310, "ทะเบียนหัว": "กข-1234", "ทะเบียนหาง": "",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 3,
    "หมายเลขยาง_เข้า": "BKK56001", "D1_เข้า": 16, "D2_เข้า": 16, "D3_เข้า": 16, "D4_เข้า": 16,
    "ชนิด/ขนาดยาง_เข้า": "R 22.5", "แรงดันก่อน": 110, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": "BKK44111", "D1_ออก": 1.2, "D2_ออก": 1.5, "D3_ออก": 1.3, "D4_ออก": 1.4,
    "ชนิด/ขนาดยาง_ออก": "R 22.5", "สาเหตุที่ถอด": "หมดสภาพ", "สถานะยางออก": "รอขายซาก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "WO-2306001", "ใบเบิกยาง": "WMS-001", "Month": "6 Jun", "Month_Year": "6 Jun/2023"
  },
  {
    MM: 7, YYYY: 2023, "วันที่บันทึก": "15/10/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/06/2023",
    "เลขไมล์ติดตั้ง": 2150000, "เบอร์รถ": 243, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 7,
    "หมายเลขยาง_เข้า": "Y2K404320", "D1_เข้า": 14, "D2_เข้า": 14, "D3_เข้า": 14, "D4_เข้า": 14,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35680U", "D1_ออก": 2.2, "D2_ออก": 2.3, "D3_ออก": 2.2, "D4_ออก": 2.1,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ดอกยางเหลือน้อย", "สถานะยางออก": "ส่งหล่อดอก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "7 Jul", "Month_Year": "7 Jul/2023"
  },
  {
    MM: 7, YYYY: 2023, "วันที่บันทึก": "20/10/2023", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "ปรีชา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "10/06/2023",
    "เลขไมล์ติดตั้ง": 1900000, "เบอร์รถ": 311, "ทะเบียนหัว": "กข-5678", "ทะเบียนหาง": "",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 11,
    "หมายเลขยาง_เข้า": "BKK56002", "D1_เข้า": 15.5, "D2_เข้า": 15.5, "D3_เข้า": 15, "D4_เข้า": 15,
    "ชนิด/ขนาดยาง_เข้า": "R 22.5", "แรงดันก่อน": 115, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": "BKK44112", "D1_ออก": 1.9, "D2_ออก": 2.0, "D3_ออก": 1.8, "D4_ออก": 1.9,
    "ชนิด/ขนาดยาง_ออก": "R 22.5", "สาเหตุที่ถอด": "ดอกยางเหลือน้อย", "สถานะยางออก": "ส่งหล่อดอก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "WMS-002", "Month": "7 Jul", "Month_Year": "7 Jul/2023"
  },
  {
    MM: 8, YYYY: 2023, "วันที่บันทึก": "05/11/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "สมชาย", "ประเภทแบบฟอร์ม": "2.ตรวจเช็ค", "วันที่ติดตั้ง": "01/07/2023",
    "เลขไมล์ติดตั้ง": 2200000, "เบอร์รถ": 244, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 1,
    "หมายเลขยาง_เข้า": "Y2K404330", "D1_เข้า": 13, "D2_เข้า": 12.5, "D3_เข้า": 13, "D4_เข้า": 12.5,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35690U", "D1_ออก": 3.5, "D2_ออก": 3.5, "D3_ออก": 3.5, "D4_ออก": 3.5,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "สลับยาง", "สถานะยางออก": "ใช้งานต่อ",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "8 Aug", "Month_Year": "8 Aug/2023"
  },
  {
    MM: 8, YYYY: 2023, "วันที่บันทึก": "12/11/2023", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "สมศรี", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "05/07/2023",
    "เลขไมล์ติดตั้ง": 1950000, "เบอร์รถ": 312, "ทะเบียนหัว": "กจ-9999", "ทะเบียนหาง": "ทส-1111",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 4,
    "หมายเลขยาง_เข้า": "BKK56003", "D1_เข้า": 16, "D2_เข้า": 16, "D3_เข้า": 16, "D4_เข้า": 16,
    "ชนิด/ขนาดยาง_เข้า": "TEST 22.5", "แรงดันก่อน": 110, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": "BKK44113", "D1_ออก": 1.0, "D2_ออก": 0.9, "D3_ออก": 1.1, "D4_ออก": 1.0,
    "ชนิด/ขนาดยาง_ออก": "R 22.5", "สาเหตุที่ถอด": "หมดสภาพ", "สถานะยางออก": "รอขายซาก",
    "หมายเหตุ": "สภาพยางแย่มาก", "ใบแจ้งซ่อม": "WO-2308001", "ใบเบิกยาง": "WMS-003", "Month": "8 Aug", "Month_Year": "8 Aug/2023"
  },
  {
    MM: 9, YYYY: 2023, "วันที่บันทึก": "01/12/2023", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/08/2023",
    "เลขไมล์ติดตั้ง": 2300000, "เบอร์รถ": 239, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 15,
    "หมายเลขยาง_เข้า": "Y2K404340", "D1_เข้า": 14, "D2_เข้า": 14, "D3_เข้า": 14, "D4_เข้า": 14,
    "ชนิด/ขนาดยาง_เข้า": "หล่อดอก 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": "VVH35700U", "D1_ออก": 2.8, "D2_ออก": 2.9, "D3_ออก": 2.8, "D4_ออก": 2.7,
    "ชนิด/ขนาดยาง_ออก": "", "สาเหตุที่ถอด": "ดอกยางเหลือน้อย", "สถานะยางออก": "ส่งหล่อดอก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "9 Sep", "Month_Year": "9 Sep/2023"
  },
  {
    MM: 9, YYYY: 2023, "วันที่บันทึก": "10/12/2023", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "ปรีชา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "10/08/2023",
    "เลขไมล์ติดตั้ง": 2000000, "เบอร์รถ": 313, "ทะเบียนหัว": "กข-2222", "ทะเบียนหาง": "",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 8,
    "หมายเลขยาง_เข้า": "BKK56004", "D1_เข้า": 15, "D2_เข้า": 15, "D3_เข้า": 15, "D4_เข้า": 15,
    "ชนิด/ขนาดยาง_เข้า": "R 22.5", "แรงดันก่อน": 112, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": "BKK44114", "D1_ออก": 1.7, "D2_ออก": 1.8, "D3_ออก": 1.6, "D4_ออก": 1.7,
    "ชนิด/ขนาดยาง_ออก": "R 22.5", "สาเหตุที่ถอด": "ดอกยางเหลือน้อย", "สถานะยางออก": "ส่งหล่อดอก",
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "WMS-004", "Month": "9 Sep", "Month_Year": "9 Sep/2023"
  },
  // --- Active tires (no ยางออก) for Planning tab ---
  {
    MM: 10, YYYY: 2023, "วันที่บันทึก": "05/01/2024", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/10/2023",
    "เลขไมล์ติดตั้ง": 2400000, "เบอร์รถ": 239, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 15,
    "หมายเลขยาง_เข้า": "Y2K404360", "D1_เข้า": 4.5, "D2_เข้า": 4.5, "D3_เข้า": 4.5, "D4_เข้า": 4.5,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "10 Oct", "Month_Year": "10 Oct/2023"
  },
  {
    MM: 10, YYYY: 2023, "วันที่บันทึก": "06/01/2024", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "สมชาย", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/10/2023",
    "เลขไมล์ติดตั้ง": 2400000, "เบอร์รถ": 240, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 10,
    "หมายเลขยาง_เข้า": "Y2K404350", "D1_เข้า": 15, "D2_เข้า": 15, "D3_เข้า": 15, "D4_เข้า": 15,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "11 Nov", "Month_Year": "11 Nov/2023"
  },
  {
    MM: 12, YYYY: 2023, "วันที่บันทึก": "20/03/2024", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "สมศรี", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "01/12/2023",
    "เลขไมล์ติดตั้ง": 2100000, "เบอร์รถ": 315, "ทะเบียนหัว": "กจ-4444", "ทะเบียนหาง": "ทส-2222",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 9,
    "หมายเลขยาง_เข้า": "BKK56015", "D1_เข้า": 5.5, "D2_เข้า": 5.5, "D3_เข้า": 5.5, "D4_เข้า": 5.5,
    "ชนิด/ขนาดยาง_เข้า": "R 22.5", "แรงดันก่อน": 115, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "12 Dec", "Month_Year": "12 Dec/2023"
  },
  {
    MM: 12, YYYY: 2023, "วันที่บันทึก": "21/03/2024", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "วิชัย", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "10/12/2023",
    "เลขไมล์ติดตั้ง": 2500000, "เบอร์รถ": 242, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 2,
    "หมายเลขยาง_เข้า": "Y2K404380", "D1_เข้า": 2.5, "D2_เข้า": 2.3, "D3_เข้า": 2.4, "D4_เข้า": 2.2,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "12 Dec", "Month_Year": "12 Dec/2023"
  },
  {
    MM: 1, YYYY: 2024, "วันที่บันทึก": "10/04/2024", "ศูนย์บริการ": "ฟลีตขนส่ง กรุงเทพ",
    "ชื่อผู้บันทึก": "ประยุทธ์", "ประเภทแบบฟอร์ม": "1.การเปลี่ยนยาง", "วันที่ติดตั้ง": "15/01/2024",
    "เลขไมล์ติดตั้ง": 2200000, "เบอร์รถ": 316, "ทะเบียนหัว": "กข-7777", "ทะเบียนหาง": "",
    "สังกัดรถ": "เอกชน (BKK)", "ตำแหน่งล้อยาง": 12,
    "หมายเลขยาง_เข้า": "BKK56020", "D1_เข้า": 3.8, "D2_เข้า": 3.9, "D3_เข้า": 3.8, "D4_เข้า": 3.7,
    "ชนิด/ขนาดยาง_เข้า": "R 22.5", "แรงดันก่อน": 110, "แรงดันหลัง": 120,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "1 Jan", "Month_Year": "1 Jan/2024"
  },
  {
    MM: 1, YYYY: 2024, "วันที่บันทึก": "12/04/2024", "ศูนย์บริการ": "ฟลีตขนส่ง ศรีราชา",
    "ชื่อผู้บันทึก": "เกษสุดา", "ประเภทแบบฟอร์ม": "2.ตรวจเช็ค", "วันที่ติดตั้ง": "20/01/2024",
    "เลขไมล์ติดตั้ง": 2550000, "เบอร์รถ": 243, "ทะเบียนหัว": "", "ทะเบียนหาง": "",
    "สังกัดรถ": "โอนคลัง (Fleet SR)", "ตำแหน่งล้อยาง": 7,
    "หมายเลขยาง_เข้า": "Y2K404390", "D1_เข้า": 6.5, "D2_เข้า": 6.5, "D3_เข้า": 6.5, "D4_เข้า": 6.5,
    "ชนิด/ขนาดยาง_เข้า": "B 11R", "แรงดันก่อน": null, "แรงดันหลัง": null,
    "หมายเลขยาง_ออก": null, "D1_ออก": null, "D2_ออก": null, "D3_ออก": null, "D4_ออก": null,
    "ชนิด/ขนาดยาง_ออก": null, "สาเหตุที่ถอด": null, "สถานะยางออก": null,
    "หมายเหตุ": "", "ใบแจ้งซ่อม": "", "ใบเบิกยาง": "", "Month": "1 Jan", "Month_Year": "1 Jan/2024"
  },
];

// ============================================================
// Parse date string/number/object → Date object
// ============================================================
export const parseDateThai = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

  const str = String(dateVal).trim();
  if (!str) return null;

  // Excel Serial Number (e.g. 45123 or 46122 or even Buddhist year serials)
  if (/^\d+(\.\d+)?$/.test(str) && Number(str) > 30000) {
    const d = new Date(1900, 0, Math.floor(Number(str)) - 1);
    if (d.getFullYear() > 2500) {
      d.setFullYear(d.getFullYear() - 543);
    }
    return d;
  }

  // Handle Thai text dates like "1 ส.ค 2026" or "1 ส.ค. 2569"
  const thaiMonths = {
    'ม.ค.': 1, 'ม.ค': 1, 'มกราคม': 1,
    'ก.พ.': 2, 'ก.พ': 2, 'กุมภาพันธ์': 2,
    'มี.ค.': 3, 'มี.ค': 3, 'มีนาคม': 3,
    'เม.ย.': 4, 'เม.ย': 4, 'เมษายน': 4,
    'พ.ค.': 5, 'พ.ค': 5, 'พฤษภาคม': 5,
    'มิ.ย.': 6, 'มิ.ย': 6, 'มิถุนายน': 6,
    'ก.ค.': 7, 'ก.ค': 7, 'กรกฎาคม': 7,
    'ส.ค.': 8, 'ส.ค': 8, 'สิงหาคม': 8,
    'ก.ย.': 9, 'ก.ย': 9, 'กันยายน': 9,
    'ต.ค.': 10, 'ต.ค': 10, 'ตุลาคม': 10,
    'พ.ย.': 11, 'พ.ย': 11, 'พฤศจิกายน': 11,
    'ธ.ค.': 12, 'ธ.ค': 12, 'ธันวาคม': 12
  };
  
  const textMatch = str.match(/^(\d{1,2})\s+([^\s\d]+)\s+(\d{2,4})$/);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const monthStr = textMatch[2];
    let year = Number(textMatch[3]);
    
    if (thaiMonths[monthStr]) {
      const month = thaiMonths[monthStr];
      if (year < 100) {
        if (year > 40) year += 2500;
        else year += 2000;
      } else if (year >= 100 && year <= 999) {
        // Handle typos like 206 -> 2026 or 569 -> 2569
        if (year >= 500) year += 2000;
        else if (year >= 200 && year < 300) year = 2020 + (year % 10); // 206 -> 2026
        else year = 2000 + (year % 100);
      }
      if (year > 2500) year -= 543;
      return new Date(year, month - 1, day);
    }
  }

  // Standard DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY or DD.MM.YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let p0 = Number(parts[0]);
    let p1 = Number(parts[1]);
    let p2 = Number(parts[2]);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      // If YYYY/MM/DD or YYYY-MM-DD
      if (p0 > 1000) {
        let year = p0;
        if (year > 2500) year -= 543;
        return new Date(year, p1 - 1, p2);
      }

      // Otherwise DD/MM/YYYY
      let year = p2;
      // Handle 2 digit years like '23' or '66'
      if (year < 100) {
        if (year > 40) year += 2500; // e.g. 66 -> 2566
        else year += 2000; // e.g. 23 -> 2023
      } else if (year >= 100 && year <= 999) {
        // Handle typos like 206 -> 2026 or 569 -> 2569
        if (year >= 500) year += 2000;
        else if (year >= 200 && year < 300) year = 2020 + (year % 10); // 206 -> 2026
        else year = 2000 + (year % 100);
      }
      if (year > 2500) year -= 543;
      return new Date(year, p1 - 1, p0);
    }
  }

  // Only fallback to new Date() if it looks like a real date string with letters
  if (/[a-zA-Z]/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      if (parsed.getFullYear() > 2500) parsed.setFullYear(parsed.getFullYear() - 543);
      if (parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) return parsed;
    }
  }
  
  return null;
};

// Average only non-null, numeric tread readings to handle missing D values
const avgTread = (...vals) => {
  const valid = vals.filter(v => v != null && !isNaN(Number(v)));
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + Number(v), 0) / valid.length;
};

// ============================================================
// Helper: Normalize tire positions (e.g. "ตำแหน่งล้อ 3" -> "3", "03" -> "3", "1 (หน้าซ้าย)" -> "1")
// ============================================================
const normalizePosition = (posStr) => {
  if (posStr == null) return null;
  const s = String(posStr).trim();
  if (!s) return null;

  const lower = s.toLowerCase();

  // Canonicalize spare/extra tire positions so install & remove records match correctly
  if (lower.includes('ยางอะไหล่') || lower.includes('spare') || lower.includes('อะไหล่')) {
    if (lower.includes('หัว') || lower.includes('head')) return 'อะไหล่หัว';
    if (lower.includes('หาง') || lower.includes('tail') || lower.includes('rear')) return 'อะไหล่หาง';
    return 'อะไหล่ทั่วไป';
  }
  if (lower === 'หัว' || lower === 'head') return 'อะไหล่หัว';
  if (lower === 'หาง' || lower === 'tail') return 'อะไหล่หาง';

  // Extract numeric position (e.g. "ล้อ 7" -> "7", "07" -> "7", "ตำแหน่งล้อ 1" -> "1", "1 (หน้าซ้าย)" -> "1")
  const match = s.match(/(\d+)/);
  if (match) {
    return String(parseInt(match[1], 10));
  }

  return s;
};

// ============================================================
// Calculate avg wear rate (mm/day) from historical completed records
// ============================================================
export const calculateWearRates = (data) => {
  const ratesByPosition = {};
  const globalRates = [];
  const truckUsage = {};

  // Pass 1: Record all installations and truck usage boundaries
  const installMap = {};
  data.forEach(row => {
    const installDate = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]);
    const mileage = Number(row["เลขไมล์ติดตั้ง"]);

    // Track truck usage (km/day)
    if (row["เบอร์รถ"] && installDate && !isNaN(mileage) && mileage > 0) {
      const truck = String(row["เบอร์รถ"]).trim();
      if (!truckUsage[truck]) {
        truckUsage[truck] = { minDate: installDate, maxDate: installDate, minMileage: mileage, maxMileage: mileage };
      } else {
        if (installDate < truckUsage[truck].minDate) truckUsage[truck].minDate = installDate;
        if (installDate > truckUsage[truck].maxDate) truckUsage[truck].maxDate = installDate;
        if (mileage < truckUsage[truck].minMileage) truckUsage[truck].minMileage = mileage;
        if (mileage > truckUsage[truck].maxMileage) truckUsage[truck].maxMileage = mileage;
      }
    }

    if (row["หมายเลขยาง_เข้า"] && row["D1_เข้า"] != null) {
      const avgIn = avgTread(row["D1_เข้า"], row["D2_เข้า"], row["D3_เข้า"], row["D4_เข้า"]);
      if (avgIn != null && installDate) {
        installMap[String(row["หมายเลขยาง_เข้า"]).trim()] = {
          date: installDate,
          tread: avgIn,
          mileage: mileage
        };
      }
    }
  });

  // Calculate km/day per truck
  const usageRateMap = {};
  let totalKm = 0;
  let totalDays = 0;
  Object.keys(truckUsage).forEach(truck => {
    const usage = truckUsage[truck];
    const daysDiff = (usage.maxDate - usage.minDate) / (1000 * 60 * 60 * 24);
    const kmDiff = usage.maxMileage - usage.minMileage;
    if (daysDiff >= 15 && kmDiff > 0) { // Require at least 15 days of data for a reliable average
      const rate = kmDiff / daysDiff;
      if (rate > 0 && rate <= 2000) { // Filter out anomalies (max 2000 km/day)
        usageRateMap[truck] = rate;
        totalKm += kmDiff;
        totalDays += daysDiff;
      }
    }
  });

  const globalUsageRate = totalDays > 0 ? totalKm / totalDays : 300; // Default 300 km/day

  // Pass 2: Calculate wear (mm/km) for removals
  data.forEach(row => {
    const tireOut = row["หมายเลขยาง_ออก"] ? String(row["หมายเลขยาง_ออก"]).trim() : null;
    if (tireOut && row["D1_ออก"] != null) {
      const avgOut = avgTread(row["D1_ออก"], row["D2_ออก"], row["D3_ออก"], row["D4_ออก"]);
      const removeMileage = Number(row["เลขไมล์ติดตั้ง"]);
      const installRec = installMap[tireOut];
      
      if (installRec && avgOut != null && !isNaN(removeMileage) && removeMileage > installRec.mileage) {
        const kmDiff = removeMileage - installRec.mileage;
        const treadWorn = installRec.tread - avgOut;
        
        // Only consider valid lifespans (e.g. > 1000 km) and valid wear
        if (kmDiff > 1000 && treadWorn > 0) {
          const wearPerKm = treadWorn / kmDiff;
          
          // Filter out anomalies (e.g. 0.001 mm/km = 1mm per 1,000km, reasonable upper bound for trucks)
          if (wearPerKm > 0 && wearPerKm <= 0.001) {
            globalRates.push(wearPerKm);
            const pos = normalizePosition(row["ตำแหน่งล้อยาง"]);
            if (pos) {
              if (!ratesByPosition[pos]) ratesByPosition[pos] = [];
              ratesByPosition[pos].push(wearPerKm);
            }
          }
        }
      }
    }
  });

  let globalWearRatePerKm = 0.0001; // Default 1mm per 10,000km
  if (globalRates.length >= 3) {
    globalWearRatePerKm = globalRates.reduce((a, b) => a + b, 0) / globalRates.length;
  }
  
  const wearRateMapPerKm = {};
  Object.keys(ratesByPosition).forEach(pos => {
    const rates = ratesByPosition[pos];
    if (rates.length >= 1) {
      wearRateMapPerKm[pos] = rates.reduce((a, b) => a + b, 0) / rates.length;
    }
  });

  return { wearRateMapPerKm, globalWearRatePerKm, usageRateMap, globalUsageRate };
};

// ============================================================
// Main processor
// ============================================================
export const processTireData = (data, truckMetadata = null) => {
  const { wearRateMapPerKm, globalWearRatePerKm, usageRateMap, globalUsageRate } = calculateWearRates(data);

  // Pre-pass: Determine the current tire mounted on each wheel position (Wheel State Tracking)
  // This models the physical reality of the fleet to automatically resolve same-day anomalies and rotations.
  // Pre-pass: Discover the true original install date for each tire ID
  // Pre-pass: Discover the true original install date for each tire ID (fallback),
  // the latest install date for each truck and wheel position,
  // and the latest tread data for each tire.
  const trueInstallDates = {};
  const latestInstallByWheel = {};
  const latestTreadDataByTire = {};
  const latestFleetByTruck = {}; // { [truckNo]: { dateObj, fleet } }
  
  data.forEach((row) => {
    const tireIn = row["หมายเลขยาง_เข้า"] ? String(row["หมายเลขยาง_เข้า"]).trim() : null;
    const truck = String(row["เบอร์รถ"]).trim();
    const pos = normalizePosition(row["ตำแหน่งล้อยาง"]);
    
    // Track the most recent fleet designation for each truck
    const fleetStr = row["สังกัดรถ"] ? String(row["สังกัดรถ"]).trim() : null;
    const recordDateObj = parseDateThai(row["วันที่อัปเดต"]) || parseDateThai(row["วันที่บันทึก"]) || parseDateThai(row["วันที่ติดตั้ง"]);
    if (truck && fleetStr && recordDateObj) {
      if (!latestFleetByTruck[truck] || recordDateObj > latestFleetByTruck[truck].dateObj) {
        latestFleetByTruck[truck] = { dateObj: recordDateObj, fleet: fleetStr };
      }
    }

    if (tireIn) {
      const isInstall = String(row["ประเภทแบบฟอร์ม"] || "").includes("เปลี่ยนยาง") || String(row._sheet || "").includes("เปลี่ยนยาง");
      
      const dateObj = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]) || parseDateThai(row["วันที่อัปเดต"]);
      const installDateObj = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]);
      
      // 1. Track latest tread data by tire (regardless of form type, as long as tread exists)
      const d1Val = row["D1_เข้า"] != null ? row["D1_เข้า"] : row["D1"];
      const d2Val = row["D2_เข้า"] != null ? row["D2_เข้า"] : row["D2"];
      const d3Val = row["D3_เข้า"] != null ? row["D3_เข้า"] : row["D3"];
      const d4Val = row["D4_เข้า"] != null ? row["D4_เข้า"] : row["D4"];
      const hasTread = d1Val != null && String(d1Val).trim() !== "";
      if (hasTread && dateObj) {
         if (!latestTreadDataByTire[tireIn] || dateObj > latestTreadDataByTire[tireIn].dateObj) {
            latestTreadDataByTire[tireIn] = {
               dateObj,
               D1: d1Val, D2: d2Val, D3: d3Val, D4: d4Val
            };
         }
      }

      // 2. Track installations
      if (isInstall && installDateObj) {
         // Global earliest install for tire (as absolute fallback)
         if (!trueInstallDates[tireIn] || installDateObj < trueInstallDates[tireIn].dateObj) {
           trueInstallDates[tireIn] = {
             dateObj: installDateObj,
             raw: row["วันที่ติดตั้ง"] || row["วันที่บันทึก"]
           };
         }
         // Latest install for truck + wheel
         if (truck && pos) {
            const key = `${truck}_${pos}`;
            if (!latestInstallByWheel[key] || installDateObj > latestInstallByWheel[key].dateObj) {
               latestInstallByWheel[key] = {
                  dateObj: installDateObj,
                  raw: row["วันที่ติดตั้ง"] || row["วันที่บันทึก"],
                  tireId: tireIn
               };
            }
         }
      }
    }
  });

  const truckState = {}; // { [truckNo]: { [pos]: { tireId, date, index } } }
  

  data.forEach((row, index) => {
    const isInspection = String(row["ประเภทแบบฟอร์ม"] || "").includes("ตรวจเช็ค") || String(row._sheet || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ข้อมูลยาง');
    const dateObj = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]) || parseDateThai(row["วันที่อัปเดต"]);

    if (!dateObj) return;

    const truck = String(row["เบอร์รถ"]).trim();
    const pos = normalizePosition(row["ตำแหน่งล้อยาง"]);
    const tireIn = row["หมายเลขยาง_เข้า"] ? String(row["หมายเลขยาง_เข้า"]).trim() : null;
    const tireOut = row["หมายเลขยาง_ออก"] ? String(row["หมายเลขยาง_ออก"]).trim() : null;
    
    if (!truck || !pos) return;
    if (!truckState[truck]) truckState[truck] = {};

    // If a tire is removed, we only clear the wheel if the removal date is newer, 
    // OR if it's on the same date and we are actually removing the currently tracked tire.
    if (tireOut) {
      const currentWheel = truckState[truck][pos];
      if (!currentWheel || dateObj > currentWheel.date || (dateObj.getTime() === currentWheel.date.getTime() && currentWheel.tireId === tireOut)) {
        // Save which tire was removed so same-day re-installation of that same tire can be blocked
        truckState[truck][pos] = { tireId: null, lastRemovedTireId: tireOut, lastRemovedDate: dateObj, date: dateObj, index };
      }
      
      // PHYSICAL RULE: A tire can only be in ONE place.
      // If a removal record says tireOut=X, then X cannot be tracked as installed at ANY OTHER 
      // position on the same truck (handles rotation/swap where tire moved between positions).
      if (truckState[truck]) {
        Object.keys(truckState[truck]).forEach(otherPos => {
          if (otherPos !== pos && truckState[truck][otherPos] && truckState[truck][otherPos].tireId === tireOut) {
            // Only evict if removal date is at or after the install date at that position
            if (dateObj >= truckState[truck][otherPos].date) {
              truckState[truck][otherPos] = { tireId: null, lastRemovedTireId: tireOut, lastRemovedDate: dateObj, date: dateObj, index };
            }
          }
        });
      }
    }

    // If a tire is installed, we mount it on the wheel if the date is newer or same-day
    // IMPORTANT: inspection records do NOT physically install a tire.
    // They can only UPDATE the state of a tire that is ALREADY mounted on that position,
    // OR mount a tire on a position that has never been seen before (missing install data),
    // OR re-mount a tire that was removed IF the inspection date is NEWER than the removal.
    if (tireIn) {
      const currentWheel = truckState[truck][pos];
      
      let useNew = false;

      if (!currentWheel) {
        // If we have never seen this wheel before (no install, no remove),
        // an inspection record is proof that the tire exists (missing install data).
        useNew = true;
      } else if (currentWheel.tireId === null) {
        // Wheel was cleared (tire removed). Only actual installations can re-mount a tire,
        // UNLESS the inspection date is strictly NEWER than the removal date.
        // In that case, the inspection is the most recent evidence — the tire was probably
        // re-mounted but the installation record was missing.
        const sameDay = currentWheel.lastRemovedDate && dateObj.getTime() === currentWheel.lastRemovedDate.getTime();
        const sameTire = currentWheel.lastRemovedTireId && currentWheel.lastRemovedTireId === tireIn;
        const removalIsNewer = currentWheel.lastRemovedDate && dateObj <= currentWheel.lastRemovedDate;
        if (sameDay && sameTire) {
          // Same tire removed and re-installed same day → removal wins, skip mounting
        } else if (isInspection && removalIsNewer) {
          // Removal is more recent than inspection → inspection cannot undo the removal
        } else {
          // Either non-inspection install, OR inspection with a date NEWER than removal
          useNew = true;
        }
      } else {
        // Date comparison first
        if (dateObj > currentWheel.date) {
          useNew = true;
        } else if (dateObj.getTime() === currentWheel.date.getTime()) {
          // SAME DAY, SAME WHEEL collision: resolve by data quality
          const existingRow = data[currentWheel.index];
          const newRow = row;
          
          const hasTread = (r) => {
            const d = r['D1_เข้า'] != null ? r['D1_เข้า'] : r['D1'];
            return d != null && String(d).trim() !== '';
          };
          const existingHasTread = hasTread(existingRow);
          const newHasTread = hasTread(newRow);

          if (newHasTread && !existingHasTread) {
            useNew = true;
          } else if (!newHasTread && existingHasTread) {
            useNew = false;
          } else {
            const newIsChange = String(newRow['ประเภทแบบฟอร์ม']).includes('เปลี่ยนยาง') || String(newRow['ประเภทแบบฟอร์ม']).includes('สลับยาง');
            const existingIsChange = String(existingRow['ประเภทแบบฟอร์ม']).includes('เปลี่ยนยาง') || String(existingRow['ประเภทแบบฟอร์ม']).includes('สลับยาง');
            if (newIsChange && !existingIsChange) useNew = true;
            else if (!newIsChange && existingIsChange) useNew = false;
            else useNew = true; // Tiebreaker: latter row in array wins
          }
        }
      }

      if (useNew) {
        truckState[truck][pos] = { tireId: tireIn, date: dateObj, index };
      }
    }

  }); // end data.forEach (Wheel State Tracking)

  // Collect the exact row indices that represent the currently active installations
  // Deduplicate by tireId: a physical tire can only be in one place.
  // If multiple records claim the same tire on the same day, prefer the one with tread data.
  const activeRowIndices = new Set();
  const activeTiresMap = {}; // { [tireId]: state }

  Object.values(truckState).forEach(positions => {
    Object.values(positions).forEach(state => {
      if (state.tireId && state.index !== undefined) {
        if (activeTiresMap[state.tireId]) {
          const existingState = activeTiresMap[state.tireId];
          const newIndex = state.index;
          const existingRow = data[existingState.index];
          const newRow = data[newIndex];
          
          let useNew = false;

          // DATE COMPARISON FIRST: A newer installation date represents the true current physical location
          if (state.date > existingState.date) {
              useNew = true;
            } else if (state.date < existingState.date) {
              useNew = false;
            } else {
              // SAME DAY collision (on different wheels): resolve by data quality
              const hasTread = (r) => {
                const d = r['D1_เข้า'] != null ? r['D1_เข้า'] : r['D1'];
                return d != null && String(d).trim() !== '';
              };
              const existingHasTread = hasTread(existingRow);
              const newHasTread = hasTread(newRow);

              if (newHasTread && !existingHasTread) {
                useNew = true;
              } else if (!newHasTread && existingHasTread) {
                useNew = false;
              } else {
                // Both have tread or neither has tread. Prefer explicit change forms over generic tabs.
                const newIsChange = String(newRow['ประเภทแบบฟอร์ม']).includes('เปลี่ยนยาง') || String(newRow['ประเภทแบบฟอร์ม']).includes('สลับยาง');
                const existingIsChange = String(existingRow['ประเภทแบบฟอร์ม']).includes('เปลี่ยนยาง') || String(existingRow['ประเภทแบบฟอร์ม']).includes('สลับยาง');
                if (newIsChange && !existingIsChange) useNew = true;
                else if (!newIsChange && existingIsChange) useNew = false;
                else useNew = true; // Tie-breaker: use newer record in array
              }
            }


          if (state.tireId === 'Y3K133087') {
            console.log('DEBUG Y3K133087 CONFLICT:', {
              existing: { date: existingState.date, truck: existingRow['เบอร์รถ'], pos: existingRow['ตำแหน่งล้อยาง'], form: existingRow['ประเภทแบบฟอร์ม'], tread: existingRow['D1_เข้า'] },
              new: { date: state.date, truck: newRow['เบอร์รถ'], pos: newRow['ตำแหน่งล้อยาง'], form: newRow['ประเภทแบบฟอร์ม'], tread: newRow['D1_เข้า'] },
              useNew
            });
          }

          if (useNew) {
            activeRowIndices.delete(existingState.index);
            activeRowIndices.add(newIndex);
            activeTiresMap[state.tireId] = state;
          }
        } else {
          activeRowIndices.add(state.index);
          activeTiresMap[state.tireId] = state;
        }
      }
    });
  });

  // Determine Truck Type — prefer value from 'Data รถ' (ประเภทรถ column), fallback to wheel-count heuristic
  const truckTypeMap = {};
  Object.entries(truckState).forEach(([t, positions]) => {
    // Fallback: guess from wheel positions (10W or 22W)
    let fallbackType = "สิบล้อ";
    Object.keys(positions).forEach(pStr => {
      const p = parseInt(pStr, 10);
      if (!isNaN(p) && p > 10 && p <= 22) {
        fallbackType = "เทรลเลอร์"; // positions > 10 → trailer axle detected
      }
    });
    // Prefer authoritative type from Data รถ if available
    const metaType = truckMetadata && truckMetadata[t] && truckMetadata[t].truckType;
    truckTypeMap[t] = metaType || fallbackType;
  });

  return data.map((row, index) => {
    const pos = normalizePosition(row["ตำแหน่งล้อยาง"]);
    let wearRatePerKm = globalWearRatePerKm;
    if (pos && wearRateMapPerKm[pos]) {
      wearRatePerKm = wearRateMapPerKm[pos];
    }
    wearRatePerKm = wearRatePerKm > 0 ? wearRatePerKm : 0.0001; // Ultimate fallback 1mm per 10k km

    const truck = String(row["เบอร์รถ"]).trim();
    const usagePerDay = usageRateMap[truck] || globalUsageRate;

    // --- Truck Type Determination ---
    // Priority: 1) from Data รถ (via truckTypeMap), 2) from head/tail plate lookup, 3) 'ไม่ระบุ'
    const truckType = truckTypeMap[truck]
      || row['_headTruckType']
      || row['_tailTruckType']
      || (truckMetadata && truckMetadata[truck] ? truckMetadata[truck].truckType : null)
      || 'ไม่ระบุ';

    // --- Tread depth: OUT tire ---
    let avgTreadOut = null;
    let isNonCompliant = false;
    if (row["D1_ออก"] != null && row["หมายเลขยาง_ออก"]) {
      const out = avgTread(row["D1_ออก"], row["D2_ออก"], row["D3_ออก"], row["D4_ออก"]);
      if (out != null) {
        avgTreadOut = out;
        isNonCompliant = avgTreadOut < 2.0;
      }
    }

    // --- Install date (for UI/Dashboard grouping) ---
    const installDateObj = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]);

    // --- Baseline date for forecasting ---
    // If it's an inspection, the tread was measured on the record date.
    // If it's an installation, the tread was measured on the install date.
    const isInspection = String(row["ประเภทแบบฟอร์ม"] || "").includes("ตรวจเช็ค") || String(row._sheet || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ข้อมูลยาง');
    const baselineDateObj = isInspection 
      ? (parseDateThai(row["วันที่บันทึก"]) || installDateObj)
      : installDateObj;

    // Override MM and YYYY to prioritize Install Date as requested by user
    let effectiveMM = row.MM;
    let effectiveYYYY = row.YYYY;
    if (installDateObj) {
      effectiveMM = installDateObj.getMonth() + 1;
      effectiveYYYY = installDateObj.getFullYear();
    }

    // Compute effective wear rate per day with a realistic lower bound
    let effectiveWearRatePerDay = wearRatePerKm * usagePerDay;
    // Enforce a minimum wear rate of 0.015 mm/day (approx 1mm per 66 days) 
    // to prevent unrealistic forecasts like 10 years into the future when data is sparse or odometer readings are erroneous
    if (effectiveWearRatePerDay < 0.015) {
      effectiveWearRatePerDay = 0.015;
    }

    // --- Tread depth: IN tire ---
    let avgTreadIn = null;
    let estimatedDaysLeft = null;
    let forecastDate = null;
    
    let d1 = row["D1_เข้า"] != null ? row["D1_เข้า"] : row["D1"];
    let d2 = row["D2_เข้า"] != null ? row["D2_เข้า"] : row["D2"];
    let d3 = row["D3_เข้า"] != null ? row["D3_เข้า"] : row["D3"];
    let d4 = row["D4_เข้า"] != null ? row["D4_เข้า"] : row["D4"];
    
    const tireIn = row["หมายเลขยาง_เข้า"] ? String(row["หมายเลขยาง_เข้า"]).trim() : null;
    
    // Fallback logic if current row has no tread data
    if ((d1 == null || String(d1).trim() === "") && tireIn && latestTreadDataByTire[tireIn]) {
        const fallback = latestTreadDataByTire[tireIn];
        d1 = fallback.D1;
        d2 = fallback.D2;
        d3 = fallback.D3;
        d4 = fallback.D4;
    }

    if (d1 != null && String(d1).trim() !== "") {
      avgTreadIn = avgTread(d1, d2, d3, d4);
      if (avgTreadIn == null) avgTreadIn = Number(d1);
      const usableTread = avgTreadIn - 2.0;
      
      const totalLifespanDays = usableTread > 0 ? Math.round(usableTread / effectiveWearRatePerDay) : 0;
      
      if (baselineDateObj) {
        // Forecast date is baseline date + total lifespan
        forecastDate = new Date(baselineDateObj.getTime() + totalLifespanDays * 24 * 60 * 60 * 1000);
        const today = new Date();
        // Estimated days left is the difference between forecast date and today
        estimatedDaysLeft = Math.round((forecastDate - today) / (1000 * 60 * 60 * 24));
      }
    }

    // --- Is active (Wheel State Tracking check) ---
    // A row is active ONLY if its exact index matches the currently mounted tire on its wheel position
    const isActive = activeRowIndices.has(index);

    // --- Tire Classification ---
    // Use the raw string from the database (either from 'รับยางเข้า' or main form)
    let tireClass = String(row["ขนาดยาง_รับเข้า_เข้า"] || row["ชนิด/ขนาดยาง_เข้า"] || "ไม่ระบุ").trim();

    const truckKey = truck && pos ? `${truck}_${pos}` : null;
    const trueInstallRaw = (truckKey && latestInstallByWheel[truckKey] && latestInstallByWheel[truckKey].tireId === tireIn 
      ? latestInstallByWheel[truckKey].raw 
      : null) || (tireIn && trueInstallDates[tireIn] ? trueInstallDates[tireIn].raw : null) || row["วันที่ติดตั้ง"] || null;

    return {
      ...row,
      "สังกัดรถ": (latestFleetByTruck[truck] && latestFleetByTruck[truck].fleet) ? latestFleetByTruck[truck].fleet : row["สังกัดรถ"],
      "D1_เข้า": d1,
      "D2_เข้า": d2,
      "D3_เข้า": d3,
      "D4_เข้า": d4,
      "ตำแหน่งล้อยาง": pos || row["ตำแหน่งล้อยาง"], // Override with normalized value if available
      truckType,
      avgTreadOut: avgTreadOut !== null ? Number(avgTreadOut.toFixed(2)) : null,
      isNonCompliant,
      avgTreadIn: avgTreadIn !== null ? Number(avgTreadIn.toFixed(2)) : null,
      estimatedDaysLeft,
      forecastDate,
      installDateObj,
      isActive,
      tireClass,
      trueInstallDateRaw: trueInstallRaw,
      MM: effectiveMM,
      YYYY: effectiveYYYY,
      avgWearRate: Number(effectiveWearRatePerDay.toFixed(4)), // Compatible with old UI
      wearRatePerKm,
      usagePerDay
    };
  });
};

// ============================================================
// Dashboard KPI Stats
// ============================================================
export const getDashboardStats = (processedData, filters = {}) => {
  let filtered = processedData;

  // Apply filters
  if (filters.year) filtered = filtered.filter(r => String(r.YYYY) === String(filters.year));
  if (filters.month) filtered = filtered.filter(r => String(r.MM) === String(filters.month));
  if (filters.center) filtered = filtered.filter(r => r["ศูนย์บริการ"] === filters.center);
  if (filters.unit) filtered = filtered.filter(r => r["สังกัดรถ"] === filters.unit);

  let totalRemoved = 0;
  let totalNonCompliant = 0;
  let totalReadyForRetread = 0; // 2.0–4.0 mm: can be retreaded
  const removalReasons = {};
  const exitStatus = {};
  const monthlyDataMap = {};

  filtered.forEach(row => {
    if (row["หมายเลขยาง_ออก"]) {
      totalRemoved++;
      if (row.isNonCompliant) totalNonCompliant++;
      if (row.avgTreadOut !== null && row.avgTreadOut >= 2.0 && row.avgTreadOut <= 4.0) totalReadyForRetread++;

      // Removal reasons
      const reason = row["สาเหตุที่ถอด"] || "ไม่ระบุ";
      removalReasons[reason] = (removalReasons[reason] || 0) + 1;

      // Exit status
      const status = row["สถานะยางออก"] || "ไม่ระบุ";
      exitStatus[status] = (exitStatus[status] || 0) + 1;

      // Monthly grouping
      if (row.MM && row.YYYY && String(row.YYYY) !== 'undefined' && String(row.MM) !== 'undefined' && !isNaN(Number(row.YYYY))) {
        const mmStr = String(row.MM).padStart(2, '0');
        const yyyyStr = String(row.YYYY);
        const sortKey = `${yyyyStr}-${mmStr}`;
        
        // Calculate a readable display name, e.g., '04/2023' or 'เม.ย. 2023'
        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const mIdx = Number(row.MM) - 1;
        const mName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : mmStr;
        const displayName = `${mName} ${yyyyStr}`;

        if (!monthlyDataMap[sortKey]) {
          monthlyDataMap[sortKey] = { name: displayName, sortKey, total: 0, nonCompliant: 0 };
        }
        monthlyDataMap[sortKey].total++;
        if (row.isNonCompliant) monthlyDataMap[sortKey].nonCompliant++;
      }
    }
  });

  // Fill in missing months to balance the chart timeline
  const sortedKeys = Object.keys(monthlyDataMap).sort();
  if (sortedKeys.length > 0) {
    const minKey = sortedKeys[0];
    const maxKey = sortedKeys[sortedKeys.length - 1];
    
    let [currYYYY, currMM] = minKey.split('-').map(Number);
    const [maxYYYY, maxMM] = maxKey.split('-').map(Number);
    
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    while (currYYYY < maxYYYY || (currYYYY === maxYYYY && currMM <= maxMM)) {
      const mmStr = String(currMM).padStart(2, '0');
      const sortKey = `${currYYYY}-${mmStr}`;
      
      if (!monthlyDataMap[sortKey]) {
        const mIdx = currMM - 1;
        const mName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : mmStr;
        const displayName = `${mName} ${currYYYY}`;
        monthlyDataMap[sortKey] = { name: displayName, sortKey, total: 0, nonCompliant: 0 };
      }
      
      currMM++;
      if (currMM > 12) {
        currMM = 1;
        currYYYY++;
      }
    }
  }

  // Compliance % = nonCompliant / totalRemoved × 100
  const complianceRate = totalRemoved > 0 ? Number(((totalNonCompliant / totalRemoved) * 100).toFixed(1)) : 0;

  // Monthly trend sorted by date
  const monthlyTrend = Object.values(monthlyDataMap)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(m => ({
      name: m.name,
      CompliancePercent: m.total > 0 ? Number(((m.nonCompliant / m.total) * 100).toFixed(1)) : 0,
      NonCompliant: m.nonCompliant,
      TotalRemoved: m.total,
      Compliant: m.total - m.nonCompliant,
    }));

  const groupSmallChartData = (dataMap) => {
    const total = Object.values(dataMap).reduce((acc, val) => acc + val, 0);
    if (total === 0) return [];
    
    const chartData = [];
    let othersTotal = 0;
    
    Object.keys(dataMap).forEach(key => {
      const val = dataMap[key];
      const percent = (val / total) * 100;
      if (percent >= 3 && val > 0) {
        chartData.push({ name: key, value: val });
      } else if (val > 0) {
        othersTotal += val;
      }
    });
    
    chartData.sort((a, b) => b.value - a.value);
    
    if (othersTotal > 0) {
      chartData.push({ name: 'อื่นๆ (<3%)', value: othersTotal });
    }
    
    return chartData;
  };

  const reasonsChart = groupSmallChartData(removalReasons);
  const exitStatusChart = groupSmallChartData(exitStatus);

  return {
    totalRemoved,
    totalNonCompliant,
    totalReadyForRetread,
    complianceRate,
    monthlyTrend,
    reasonsChart,
    exitStatusChart,
    activeTires: filtered.filter(r => r.isActive).length,
  };
};

// ============================================================
// Get unique filter options from data
// ============================================================
export const getFilterOptions = (data) => {
  const years = [...new Set(data.map(r => String(r.YYYY)).filter(y => y && y !== 'undefined' && y !== 'NaN'))].sort((a, b) => Number(b) - Number(a));
  const centers = [...new Set(data.map(r => r["ศูนย์บริการ"]).filter(Boolean))].sort();
  const units = [...new Set(data.map(r => r["สังกัดรถ"]).filter(Boolean))].sort();
  const reasons = [...new Set(data.map(r => r["สาเหตุที่ถอด"]).filter(Boolean))].sort();
  const statuses = [...new Set(data.map(r => r["สถานะยางออก"]).filter(Boolean))].sort();
  const formTypes = [...new Set(data.map(r => r["ประเภทแบบฟอร์ม"]).filter(Boolean))].sort();
  return { years, centers, units, reasons, statuses, formTypes };
};

// ============================================================
// UI Utilities
// ============================================================
export const getTruckStatusStyle = (status) => {
  if (!status) return { color: 'var(--text-secondary)', bg: 'var(--overlay-05)', dot: 'var(--text-secondary)', border: 'transparent' };
  
  if (status.includes('ปกติ')) return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', dot: '#10b981', border: 'rgba(16,185,129,0.2)' };
  if (status.includes('ซ่อม')) return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', dot: '#ef4444', border: 'rgba(239,68,68,0.2)' };
  if (status.includes('เปลี่ยนป้าย')) return { color: '#0ea5e9', bg: 'rgba(56,189,248,0.15)', dot: '#0ea5e9', border: 'rgba(56,189,248,0.2)' };
  if (status.includes('ขาย')) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', dot: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
  if (status.includes('แท็งค์เหล็ก')) return { color: '#a855f7', bg: 'rgba(192,132,252,0.15)', dot: '#a855f7', border: 'rgba(192,132,252,0.2)' };
  if (status.includes('จอด')) return { color: '#64748b', bg: 'rgba(148,163,184,0.15)', dot: '#64748b', border: 'rgba(148,163,184,0.2)' };
  
  return { color: 'var(--text-secondary)', bg: 'var(--overlay-10)', dot: 'var(--text-secondary)', border: 'var(--border-light)' };
};

// ============================================================
// Vehicle Type Badge Utility
// Maps any Thai vehicle-type string → { label, color, bg, border, emoji }
// Covers all types found in user's 'Data รถ' sheet.
// Add new vehicle types here as needed — always falls back gracefully.
// ============================================================
export const getVehicleTypeBadge = (typeStr) => {
  if (!typeStr || typeStr === 'ไม่ระบุ') {
    return { label: 'ไม่ระบุ', color: 'var(--text-secondary)', bg: 'var(--overlay-05)', border: 'var(--border-light)', emoji: '❓' };
  }

  const t = typeStr.trim();

  // ── 0. เทรลเลอร์ (Combined: หัวลาก + กึ่งพ่วง, 22W) — GRADIENT BLUE-PURPLE ──
  //    This is set by the system when both head & tail plates exist in same record
  if (t === 'เทรลเลอร์')
    return { label: 'เทรลเลอร์', color: '#818cf8', bg: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))', border: 'rgba(129,140,248,0.4)', emoji: '🚛' };

  // ── 1. หัวลาก (Head / Tractor unit) — BLUE ─────────────────
  if (t.includes('หัวลาก') || t.includes('ลากจูง') || t.includes('Tractor'))
    return { label: t, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', emoji: '🔵' };

  // ── 2. กึ่งพ่วง (สำรอง) — light purple / muted ─────────────
  //    Must be checked BEFORE plain กึ่งพ่วง to avoid being swallowed
  if (t.includes('กึ่งพ่วง') && t.includes('สำรอง'))
    return { label: t, color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)', emoji: '🔘' };

  // ── 3. กึ่งพ่วง (Semi-trailer) — PURPLE ────────────────────
  if (t.includes('กึ่งพ่วง') || t.includes('กึ่ง') || t.includes('Semi'))
    return { label: t, color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', emoji: '🟣' };

  // ── 4. รถพ่วง (Full trailer) — INDIGO ───────────────────────
  if (t === 'รถพ่วง' || t.includes('รถพ่วง') || t.includes('Trailer'))
    return { label: t, color: '#818cf8', bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.35)', emoji: '🟪' };

  // ── 5. สิบล้อ (10-wheeler) — GREEN ──────────────────────────
  if (t.includes('สิบล้อ') || t.includes('10 ล้อ') || t.includes('10ล้อ'))
    return { label: t, color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', emoji: '🟢' };

  // ── 6. หกล้อ (6-wheeler) — CYAN ─────────────────────────────
  if (t.includes('หกล้อ') || t.includes('6 ล้อ') || t.includes('6ล้อ'))
    return { label: t, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.35)', emoji: '🔷' };

  // ── 7. รถบรรทุก 4 ล้อจัมโบ้ — AMBER ───────────────────────
  if ((t.includes('รถบรรทุก') || t.includes('บรรทุก')) && t.includes('จัมโบ้'))
    return { label: t, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', emoji: '🟡' };

  // ── 8. รถบรรทุก (general cargo truck) — YELLOW ──────────────
  if (t.includes('รถบรรทุก') || t.includes('บรรทุก'))
    return { label: t, color: '#eab308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)', emoji: '🚚' };

  // ── 9. รถยนต์ 4 ล้อจัมโบ้ — ORANGE ─────────────────────────
  if (t.includes('รถยนต์') && t.includes('จัมโบ้'))
    return { label: t, color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', emoji: '🟠' };

  // ── 10. รถยนต์ (passenger / light vehicle) — TEAL ───────────
  if (t.includes('รถยนต์'))
    return { label: t, color: '#14b8a6', bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', emoji: '🚗' };

  // ── 11. รถจักรยานยนต์ (motorcycle) — ROSE ──────────────────
  if (t.includes('จักรยานยนต์') || t.includes('มอเตอร์ไซค์') || t.includes('Motorcycle'))
    return { label: t, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.35)', emoji: '🏍️' };

  // ── 12. กระบะ / Pick-up ──────────────────────────────────────
  if (t.includes('กระบะ') || t.includes('Pick'))
    return { label: t, color: '#fb923c', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)', emoji: '🛻' };

  // ── 13. แท็งค์ / Tanker ─────────────────────────────────────
  if (t.includes('แท็งค์') || t.includes('Tanker'))
    return { label: t, color: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', emoji: '🛢️' };

  // ── 14. เครน / Special ──────────────────────────────────────
  if (t.includes('เครน') || t.includes('Crane') || t.includes('พิเศษ'))
    return { label: t, color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', emoji: '🏗️' };

  // ── Fallback: unknown type — show raw value, neutral gray ───
  return { label: t, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', emoji: '🚛' };
};

// ============================================================
// Tire Rotation Advisor
// Input: tires array (active tires on a truck from Planning page)
// Output: array of recommended swaps { posA, posB, treadA, treadB, reason, priority }
// ============================================================
export const generateRotationAdvice = (tires) => {
  if (!tires || tires.length === 0) return [];

  // Build a map of position → tire data (only tires with tread data)
  const tireMap = {};
  tires.forEach(t => {
    const pos = String(t['ตำแหน่งล้อยาง']);
    if (t.avgTreadIn != null && t.avgTreadIn > 2) { // skip critical/no-data
      tireMap[pos] = { pos, tread: t.avgTreadIn, tire: t };
    }
  });

  const advice = [];
  const used = new Set(); // track positions already in a swap

  // Helper to add a swap if both positions exist, are unused, and diff is significant
  const trySwap = (posA, posB, reason, minDiff = 2) => {
    if (!tireMap[posA] || !tireMap[posB]) return;
    if (used.has(posA) || used.has(posB)) return;
    const { tread: tA } = tireMap[posA];
    const { tread: tB } = tireMap[posB];
    const diff = Math.abs(tA - tB);
    if (diff < minDiff) return;
    // Always put the worn tire (lower tread) in posA for consistent display
    const [wornPos, freshPos, wornTread, freshTread] = tA < tB
      ? [posA, posB, tA, tB]
      : [posB, posA, tB, tA];
    advice.push({
      posA: wornPos,
      posB: freshPos,
      treadA: wornTread,
      treadB: freshTread,
      diff: parseFloat(diff.toFixed(1)),
      reason,
      priority: diff >= 4 ? 'critical' : diff >= 2.5 ? 'warning' : 'info',
    });
    used.add(posA);
    used.add(posB);
  };

  // ── Rule 1: Inner ↔ Outer swap on same axle (dual wheels)
  // Axles: 3-4 & 5-6 (drive rear1), 7-8 & 9-10 (drive rear2)
  //        11-12 & 13-14, 15-16 & 17-18, 19-20 & 21-22 (trailer)
  const dualAxles = [
    [[3,5], [4,6]], // rear axle1: left inner/outer ↔ right inner/outer
    [[7,9], [8,10]], // rear axle2
    [[11,13], [12,14]],
    [[15,17], [16,18]],
    [[19,21], [20,22]],
  ];
  dualAxles.forEach(([[li, lo], [ri, ro]]) => {
    trySwap(String(li), String(lo), `สลับคู่ในออก ตำแหน่ง ${li}↔${lo} (เพลาซ้าย)`);
    trySwap(String(ri), String(ro), `สลับคู่ในออก ตำแหน่ง ${ri}↔${ro} (เพลาขวา)`);
  });

  // ── Rule 2: Cross-axle swap (same side, different axle)
  // Rear axle1 inner ↔ Rear axle2 inner (both sides)
  trySwap('3', '7', 'สลับตำแหน่ง 3↔7 ระหว่างเพลาหลัง (ซ้ายใน)');
  trySwap('4', '8', 'สลับตำแหน่ง 4↔8 ระหว่างเพลาหลัง (ขวาใน)');
  trySwap('5', '9', 'สลับตำแหน่ง 5↔9 ระหว่างเพลาหลัง (ซ้ายนอก)');
  trySwap('6', '10', 'สลับตำแหน่ง 6↔10 ระหว่างเพลาหลัง (ขวานอก)');

  // ── Rule 3: Spare tire → weakest axle position
  const sparePosKeys = Object.keys(tireMap).filter(pos => {
    const n = parseInt(pos, 10);
    return isNaN(n) || n < 1 || n > 22;
  });

  // Find the most worn non-critical non-used axle tire
  const axlePosKeys = Object.keys(tireMap).filter(pos => {
    const n = parseInt(pos, 10);
    return !isNaN(n) && n >= 1 && n <= 22;
  });

  sparePosKeys.forEach(sparePos => {
    const spareTread = tireMap[sparePos].tread;
    // Find the most worn axle position that hasn't been used
    let worstPos = null;
    let worstTread = Infinity;
    axlePosKeys.forEach(aPos => {
      if (!used.has(aPos) && tireMap[aPos].tread < worstTread) {
        worstTread = tireMap[aPos].tread;
        worstPos = aPos;
      }
    });
    if (worstPos && (spareTread - worstTread) >= 2) {
      trySwap(String(worstPos), sparePos, `นำยางอะไหล่ (${sparePos}) มาแทนตำแหน่ง ${worstPos} ที่สึกมากกว่า`);
    }
  });

  // Sort by priority: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  advice.sort((a, b) => order[a.priority] - order[b.priority]);

  return advice;
};

// ============================================================
// Process Real Data for Cohort Analysis
// ============================================================
export const processCohortData = (data, truckMetadata = {}) => {
  if (!data || !Array.isArray(data)) return [];

  const installMap = {};
  
  // Pass 1: Map installations
  data.forEach(row => {
    const installDate = parseDateThai(row["วันที่ติดตั้ง"]) || parseDateThai(row["วันที่บันทึก"]);
    const mileageStr = row["เลขไมล์ติดตั้ง"];
    const mileage = (mileageStr != null && mileageStr !== '') ? Number(mileageStr) : 0;
    const tireIn = row["หมายเลขยาง_เข้า"] ? String(row["หมายเลขยาง_เข้า"]).trim() : null;
    const truckNo = String(row["เบอร์รถ"] || '').trim();
    
    if (tireIn && row["D1_เข้า"] != null) {
      const avgIn = avgTread(row["D1_เข้า"], row["D2_เข้า"], row["D3_เข้า"], row["D4_เข้า"]);
      if (avgIn != null && installDate && mileage > 0) {
        installMap[tireIn] = {
          date: installDate,
          tread: avgIn,
          mileage: mileage,
          truckNo: truckNo,
          brand: row["ชนิด/ขนาดยาง_เข้า"] || 'Unknown'
        };
      }
    }
  });

  const cohortData = [];
  let idCounter = 1;
  const rates = [];

  // Pass 2: Map removals to installations
  data.forEach(row => {
    const tireOut = row["หมายเลขยาง_ออก"] ? String(row["หมายเลขยาง_ออก"]).trim() : null;
    const currentTruckNo = String(row["เบอร์รถ"] || '').trim();

    if (tireOut && row["D1_ออก"] != null) {
      const avgOut = avgTread(row["D1_ออก"], row["D2_ออก"], row["D3_ออก"], row["D4_ออก"]);
      const removeMileageStr = row["เลขไมล์ติดตั้ง"];
      const removeMileage = (removeMileageStr != null && removeMileageStr !== '') ? Number(removeMileageStr) : 0;
      const installRec = installMap[tireOut];
      
      // Ensure the tire was installed on the same truck, and both mileages are valid
      if (installRec && installRec.truckNo === currentTruckNo && avgOut != null && removeMileage > 0 && removeMileage > installRec.mileage) {
        const kmDiff = removeMileage - installRec.mileage;
        const treadWorn = installRec.tread - avgOut;
        
        if (kmDiff > 1000 && treadWorn > 0) {
          const wearRatePer10k = (treadWorn / kmDiff) * 10000;
          
          if (wearRatePer10k > 0 && wearRatePer10k <= 10) { // Max 10mm per 10k km (anomaly filter)
            rates.push(wearRatePer10k);
            
            const truckNo = String(row["เบอร์รถ"] || '').trim();
            const fleet = row["สังกัดรถ"] || 'Unknown';
            const position = normalizePosition(row["ตำแหน่งล้อยาง"]);
            let type = truckMetadata[truckNo]?.truckType || 'ไม่ระบุประเภท';
            if (type.includes('หัวลาก') || type.includes('กึ่งพ่วง')) {
              type = 'เทรลเลอร์';
            }

            cohortData.push({
              id: idCounter++,
              truckNo,
              fleet,
              type,
              position: position ? (isNaN(Number(position)) ? position : Number(position)) : 'ไม่ระบุ',
              brand: installRec.brand,
              serialNumber: tireOut,
              installDate: installRec.date.toISOString().split('T')[0],
              drivenKm: kmDiff,
              startTread: parseFloat(installRec.tread.toFixed(1)),
              currentTread: parseFloat(avgOut.toFixed(1)),
              wearRate: parseFloat(wearRatePer10k.toFixed(2)),
              isAnomaly: false,
              anomalyReason: ''
            });
          }
        }
      }
    }
  });

  // Calculate global average to flag anomalies
  const globalAvg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const anomalyThreshold = globalAvg * 1.5; // 50% worse than average

  // Flag anomalies
  cohortData.forEach(d => {
    if (d.wearRate > anomalyThreshold && d.wearRate > 2) {
      d.isAnomaly = true;
      d.anomalyReason = `สึกหรอเร็วกว่าค่าเฉลี่ย (${globalAvg.toFixed(1)}) ถึง ${((d.wearRate / globalAvg) * 100 - 100).toFixed(0)}%`;
    }
  });

  return cohortData;
};
