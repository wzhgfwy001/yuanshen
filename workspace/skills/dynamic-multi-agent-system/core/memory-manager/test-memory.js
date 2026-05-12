const m = require('./memory.js');

console.log('=== Memory Manager Test ===');
console.log('Stats:', JSON.stringify(m.getStats(), null, 2));
console.log('\nUser Preferences:', JSON.stringify(m.search('user_preference', 3), null, 2));
console.log('\nRead "Dreaming":', JSON.stringify(m.read('Dreaming'), null, 2));
