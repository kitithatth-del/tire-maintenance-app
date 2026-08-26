const XLSX = require('xlsx');
const path = require('path');

const targetFile = 'ข้อมูลยางเข้า ออก - Copy.xlsx';
const workbook = XLSX.readFile(path.join(__dirname, targetFile));
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const rawRowsTrue = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
console.log("raw: true");
console.log("Row 2 Date:", rawRowsTrue[2][0]); // Should be serial number
console.log("Row 2 Month_Year:", rawRowsTrue[2][31]);

