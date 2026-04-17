const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sshDir = 'C:\\Users\\DELL\\.ssh';
const keyPath = path.join(sshDir, 'id_ed25519_github');
const pubPath = path.join(sshDir, 'id_ed25519_github.pub');

// Create .ssh directory if not exists
if (!fs.existsSync(sshDir)) {
  fs.mkdirSync(sshDir, { recursive: true });
}

// Try to generate key using PowerShell heredoc to bypass interactive prompt
try {
  const psScript = `
$keyPath = '${keyPath.replace(/\\/g, '\\\\')}'
ssh-keygen -t ed25519 -C 'yangshen@github' -f $keyPath -N '' -q
`;
  
  execSync(`powershell -Command "${psScript}"`, { 
    stdio: 'inherit',
    timeout: 30000 
  });
} catch (e) {
  console.log('PowerShell method failed:', e.message);
}

// Check if key was created
if (fs.existsSync(keyPath)) {
  console.log('✅ Key created at:', keyPath);
  console.log('Public key:');
  console.log(fs.readFileSync(pubPath, 'utf8'));
} else {
  console.log('❌ Key not created');
}
