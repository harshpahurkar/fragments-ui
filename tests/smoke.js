/* eslint-disable */
// tests/smoke.js
// A very small smoke test that verifies the project has a lint script defined.
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
if (!pkg.scripts || !pkg.scripts.lint) {
  console.error('No lint script defined in package.json');
  process.exit(2);
}
console.log('OK: lint script found');
process.exit(0);
