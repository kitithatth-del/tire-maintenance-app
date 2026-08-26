const colName = 'CS';
let sum = 0;
for (let i = 0; i < colName.length; i++) {
  sum = sum * 26 + (colName.charCodeAt(i) - 64);
}
console.log('1-indexed:', sum);
console.log('0-indexed:', sum - 1);
