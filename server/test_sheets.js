const xlsx = require('xlsx');
const wb = xlsx.readFile('../tire_receive.xlsx');
console.log(wb.SheetNames);
