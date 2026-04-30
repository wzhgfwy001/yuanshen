const https = require('https');
const fs = require('fs');

const url = 'https://sns-webpic-qc.xhscdn.com/202604291136/15008d13c80e941b2b0cf4a9f078fccd/spectrum/1040g34o31v624vha3m105q39qrt79fr9cd510e8!nc_n_webp_mw_1';

const file = fs.createWriteStream('C:/Users/DELL/.openclaw/workspace/temp/xhs-qr-final.png');

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
  console.log('Status:', res.statusCode);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded! Size:', fs.statSync('C:/Users/DELL/.openclaw/workspace/temp/xhs-qr-final.png').size);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
  fs.unlinkSync('C:/Users/DELL/.openclaw/workspace/temp/xhs-qr-final.png');
});