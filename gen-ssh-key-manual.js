const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sshDir = 'C:\\Users\\DELL\\.ssh';
const keyPath = path.join(sshDir, 'id_ed25519_github');
const pubPath = path.join(sshDir, 'id_ed25519_github.pub');

// Create .ssh directory
if (!fs.existsSync(sshDir)) {
  fs.mkdirSync(sshDir, { recursive: true });
}

console.log('Generating ED25519 key pair...');

// Generate key pair
const keyPair = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const publicKeyDer = keyPair.publicKey;
// Skip the first 26 bytes (algorithm identifier for ED25519)
const keyBytes = publicKeyDer.slice(26);

console.log('Key generated');

// Write private key
fs.writeFileSync(keyPath, keyPair.privateKey, { mode: 0o600 });
console.log('Private key saved');

// Create OpenSSH format public key
const keyType = Buffer.from('ssh-ed25519');
const comment = Buffer.from('yangshen@github');

function buildOpenSSHPubKey() {
  const typeLen = Buffer.alloc(4);
  typeLen.writeUInt32BE(keyType.length);
  
  const keyLen = Buffer.alloc(4);
  keyLen.writeUInt32BE(keyBytes.length);
  
  const commentLen = Buffer.alloc(4);
  commentLen.writeUInt32BE(comment.length);
  
  return Buffer.concat([
    typeLen, keyType,
    keyLen, keyBytes,
    commentLen, comment
  ]);
}

const pubKeyPacket = buildOpenSSHPubKey();
const pubKeyBase64 = pubKeyPacket.toString('base64');

const sshPubKey = `ssh-ed25519 ${pubKeyBase64} yangshen@github\n`;

fs.writeFileSync(pubPath, sshPubKey);
console.log('Public key saved to:', pubPath);

console.log('\n=== COPY THIS KEY TO GITHUB ===\n');
console.log(sshPubKey);
console.log('===');
