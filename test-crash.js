import { processTireData } from './src/utils/dataParser.js';
import http from 'http';
http.get('http://localhost:3001/api/data', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('Processing...');
      
      const merged = [...j.checkData, ...j.changeData, ...j.receiveData];
      processTireData(merged, {});
      
      console.log('Done without crash!');
    } catch (e) {
      console.error('CRASH:', e);
    }
  });
});
