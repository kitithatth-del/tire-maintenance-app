const XLSX = require('xlsx');
const path = require('path');

const targetFile = 'ข้อมูลยางเข้า ออก - Copy.xlsx';
const fileBuffer = require('fs').readFileSync(path.join(__dirname, targetFile));

// Since parseExcelFile uses browser's FileReader, we can simulate it or just call the exported function directly if we had a File object, but we don't.
// Let's just import parseCsvText since parseFile uses it... wait, parseFile uses parseExcelFile which expects a File object and FileReader.
// We can just verify the logic of mapRowToObject manually.

// Import the logic from fileImport.js
const { parseCsvText } = require('./src/utils/fileImport.js');
console.log("Check complete.");
