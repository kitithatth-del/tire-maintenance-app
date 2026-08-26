const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

try {
  // Find the file that matches the pattern
  const files = fs.readdirSync(__dirname);
  const targetFile = files.find(f => f.includes('Copy.xlsx'));
  
  if (!targetFile) {
    console.log("File not found.");
    process.exit(1);
  }
  
  console.log("Found file:", targetFile);
  
  const workbook = XLSX.readFile(path.join(__dirname, targetFile));
  const sheetName = workbook.SheetNames[0]; // Let's check the first sheet, or all sheets
  
  console.log("Sheet names:", workbook.SheetNames);
  
  // Also check if there's a sheet named "ข้อมูลเปลี่ยนยาง"
  let targetSheetName = sheetName;
  if (workbook.SheetNames.includes("ข้อมูลเปลี่ยนยาง")) {
    targetSheetName = "ข้อมูลเปลี่ยนยาง";
  } else if (workbook.SheetNames.includes("ข้อมูลยางเข้า ออก - Copy")) {
    targetSheetName = "ข้อมูลยางเข้า ออก - Copy";
  }
  
  console.log("Using Sheet name:", targetSheetName);
  
  const worksheet = workbook.Sheets[targetSheetName];
  
  // Get raw rows
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null,
  });
  
  console.log("\n--- ROW 0 (Index 0) ---");
  console.log(rawRows[0] ? rawRows[0].slice(0, 35) : "null");
  
  console.log("\n--- ROW 1 (Index 1) ---");
  console.log(rawRows[1] ? rawRows[1].slice(0, 35) : "null");
  
  console.log("\n--- ROW 2 (Index 2) ---");
  console.log(rawRows[2] ? rawRows[2].slice(0, 35) : "null");

  console.log("\n--- ROW 3 (Index 3) ---");
  console.log(rawRows[3] ? rawRows[3].slice(0, 35) : "null");

} catch (err) {
  console.error("Error reading file:", err);
}
