const { chromium } = require('playwright');

async function launchEdgeWithDebug() {
  console.log('Launching Edge with remote debugging...');
  
  // Launch Edge with debugging port using executablePath
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: false,
    args: ['--remote-debugging-port=9222']
  });
  
  console.log('Browser launched!');
  
  // Keep browser alive for a bit to verify it's working
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('Done - browser should be running with debugging on port 9222');
  console.log('Connect to: http://localhost:9222/json');
  
  // Note: Don't close browser yet
}

launchEdgeWithDebug().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
