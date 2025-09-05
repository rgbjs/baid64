import fs from 'fs';

// Read the ES module
const esModule = fs.readFileSync('./index.js', 'utf8');

// Convert to CommonJS
const cjsModule = esModule
  .replace(/import { createHash } from 'crypto';/, "const { createHash } = require('crypto');")
  .replace(/export const/g, 'const')
  .replace(/export function/g, 'function')
  .replace(/export default {/, 'module.exports = {');

// Write CommonJS version
fs.writeFileSync('./index.cjs', cjsModule);
console.log('Created index.cjs for CommonJS compatibility');