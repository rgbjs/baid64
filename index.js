import { createHash } from 'crypto';

// Constants matching Rust implementation
export const BAID64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~';
const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Helper to convert between alphabets
function toStandardBase64(baid64Str) {
  let result = '';
  for (let char of baid64Str) {
    const idx = BAID64_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid baid64 character: ${char}`);
    result += STANDARD_ALPHABET[idx];
  }
  return result;
}

function fromStandardBase64(base64Str) {
  let result = '';
  for (let char of base64Str) {
    const idx = STANDARD_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base64 character: ${char}`);
    result += BAID64_ALPHABET[idx];
  }
  return result;
}

// Calculate checksum matching Rust implementation
export function calculateChecksum(hri, payload) {
  // First hash: SHA256 of HRI
  const key = createHash('sha256').update(hri).digest();
  
  // Second hash: SHA256 with key as prefix, then payload
  const hash = createHash('sha256');
  hash.update(key);
  hash.update(payload);
  const result = hash.digest();
  
  // Return [result[0], result[1], result[1], result[2]] - note duplication!
  return Buffer.from([result[0], result[1], result[1], result[2]]);
}

// Main encoding function
export function encode(payload, options = {}) {
  const {
    hri = '',
    chunking = false,
    chunkFirst = 8,
    chunkLen = 7,
    prefix = false,
    mnemonic = false,
    embedChecksum = false
  } = options;
  
  let data = Buffer.from(payload);
  
  // Add embedded checksum if requested
  if (embedChecksum && hri) {
    const checksum = calculateChecksum(hri, data);
    data = Buffer.concat([data, checksum]);
  }
  
  // Convert to base64 with custom alphabet
  let encoded = fromStandardBase64(data.toString('base64').replace(/=/g, ''));
  
  // Apply chunking if requested
  if (chunking) {
    let chunked = encoded.slice(0, chunkFirst);
    for (let i = chunkFirst; i < encoded.length; i += chunkLen) {
      chunked += '-' + encoded.slice(i, i + chunkLen);
    }
    encoded = chunked;
  }
  
  // Build final string
  let result = '';
  if (prefix && hri) {
    result += hri + ':';
  }
  result += encoded;
  
  // Note: mnemonic encoding would require additional library
  // Skipping for basic implementation
  
  return result;
}

// Main decoding function
export function decode(baid64Str, expectedHri = null) {
  let str = baid64Str;
  let hri = '';
  let mnemonic = '';
  
  // Extract HRI if present
  if (str.includes(':')) {
    [hri, str] = str.split(':');
    if (expectedHri && hri !== expectedHri) {
      throw new Error(`Invalid HRI: expected ${expectedHri}, got ${hri}`);
    }
  }
  
  // Extract mnemonic if present
  if (str.includes('#')) {
    [str, mnemonic] = str.split('#');
  }
  
  // Remove chunking
  str = str.replace(/-/g, '');
  
  // Convert to standard base64 and decode
  const standardBase64 = toStandardBase64(str);
  const paddingNeeded = (4 - (standardBase64.length % 4)) % 4;
  const padded = standardBase64 + '='.repeat(paddingNeeded);
  const decoded = Buffer.from(padded, 'base64');
  
  // Check if last 4 bytes might be checksum
  let payload = decoded;
  let embeddedChecksum = null;
  
  if (hri && decoded.length > 4) {
    // Could have embedded checksum
    const possiblePayload = decoded.slice(0, -4);
    const possibleChecksum = decoded.slice(-4);
    const expectedChecksum = calculateChecksum(hri, possiblePayload);
    
    if (Buffer.compare(possibleChecksum, expectedChecksum) === 0) {
      payload = possiblePayload;
      embeddedChecksum = possibleChecksum;
    }
  }
  
  return {
    hri,
    payload,
    embeddedChecksum,
    mnemonic
  };
}

// Default export with all functions
export default {
  encode,
  decode,
  calculateChecksum,
  BAID64_ALPHABET
};