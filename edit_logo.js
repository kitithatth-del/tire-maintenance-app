const Jimp = require('jimp');

Jimp.read('logo.png')
  .then(img => {
    let inFirstBlock = false;
    let gapFound = false;
    let splitY = 0;
    
    // Scan rows from top to bottom
    for (let y = 0; y < img.bitmap.height; y++) {
      let hasPixel = false;
      for (let x = 0; x < img.bitmap.width; x++) {
        const idx = (img.bitmap.width * y + x) << 2;
        const alpha = img.bitmap.data[idx + 3];
        if (alpha > 10) { 
          hasPixel = true; 
          break; 
        }
      }
      
      if (hasPixel && !inFirstBlock && !gapFound) {
        inFirstBlock = true;
      } else if (!hasPixel && inFirstBlock && !gapFound) {
        gapFound = true;
      } else if (hasPixel && gapFound) {
        splitY = y - 2; // Split just slightly above the logistics text
        break;
      }
    }
    
    if (splitY > 0) {
      console.log("Gap found! Splitting at Y =", splitY);
      for (let y = splitY; y < img.bitmap.height; y++) {
        for (let x = 0; x < img.bitmap.width; x++) {
          const idx = (img.bitmap.width * y + x) << 2;
          if (img.bitmap.data[idx + 3] > 0) {
            img.bitmap.data[idx] = 0;   // R = 0
            img.bitmap.data[idx+1] = 0; // G = 0
            img.bitmap.data[idx+2] = 0; // B = 0
          }
        }
      }
      img.write('logo.png');
      console.log("Logo updated successfully! Bottom part is now black.");
    } else {
      console.log("Gap not found! Image may not have a clear separation.");
    }
  })
  .catch(err => {
    console.error("Error processing image:", err);
  });
