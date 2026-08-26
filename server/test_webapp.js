const axios = require('axios');

async function testWebApp() {
  const url = 'https://script.google.com/macros/s/AKfycbzlavkGiBdBZq4iB54NTUbl_znbydFRAyjp7YGMaaPEvO5CZcdMdqr74-Wj2KxccdJy/exec';
  const start = Date.now();
  
  console.log('Fetching รับยางเข้า...');
  try {
    const res = await axios.get(url + '?action=receive');
    const data = res.data;
    console.log(`Success! Time: ${(Date.now() - start)/1000}s`);
    console.log(`Received ${data.length} rows`);
    if (data.length > 0) {
      console.log('Sample row:', JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      require('fs').writeFileSync('error.html', err.response.data);
      console.error('Data saved to error.html');
    }
  }
}

testWebApp();
