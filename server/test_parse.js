const fs = require('fs');
const { parse } = require('csv-parse');

const start = Date.now();
const records = [];

fs.createReadStream('test.csv')
  .pipe(parse({ columns: true, skip_empty_lines: true }))
  .on('data', (row) => {
    records.push(row);
  })
  .on('end', () => {
    console.log(`✅ Parsed ${records.length} rows in ${(Date.now() - start)} ms`);
    console.log('Sample row:', JSON.stringify(records[0], null, 2));
  })
  .on('error', (err) => {
    console.error('Error parsing CSV:', err.message);
  });
