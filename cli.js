#!/usr/bin/env node

import { encode, decode } from './index.js';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const command = args[0];
const options = {};

// Parse command line arguments
let input = '';
let i = 1;

while (i < args.length) {
  const arg = args[i];
  
  if (arg === '-h' || arg === '--help') {
    showHelp();
    process.exit(0);
  } else if (arg === '--hri') {
    options.hri = args[++i];
  } else if (arg === '--prefix') {
    options.prefix = true;
  } else if (arg === '--chunking') {
    options.chunking = true;
  } else if (arg === '--chunk-first') {
    options.chunkFirst = parseInt(args[++i]);
  } else if (arg === '--chunk-len') {
    options.chunkLen = parseInt(args[++i]);
  } else if (arg === '--embed-checksum') {
    options.embedChecksum = true;
  } else if (arg === '--expected-hri') {
    options.expectedHri = args[++i];
  } else if (arg === '-f' || arg === '--file') {
    const filename = args[++i];
    input = readFileSync(filename);
  } else if (!arg.startsWith('-')) {
    input = arg;
  }
  i++;
}

function showHelp() {
  console.log(`
baid64 - URL-safe Base64 encoding with checksums

Usage:
  baid64 encode [options] <input>    Encode data to baid64
  baid64 decode [options] <input>    Decode baid64 string
  baid64 -h, --help                  Show this help

Options:
  -f, --file <path>         Read input from file
  --hri <identifier>        Human Readable Identifier
  --prefix                  Include HRI prefix in output
  --chunking                Enable chunking with hyphens
  --chunk-first <n>         First chunk size (default: 8)
  --chunk-len <n>           Subsequent chunk sizes (default: 7)
  --embed-checksum          Embed checksum in encoded data
  --expected-hri <hri>      Validate against expected HRI (decode only)

Examples:
  # Encode text
  baid64 encode "Hello World"
  
  # Encode with HRI and chunking
  baid64 encode --hri myapp --prefix --chunking "Hello World"
  
  # Encode file
  baid64 encode -f data.bin --embed-checksum --hri myapp
  
  # Decode
  baid64 decode "SGVsbG8gV29ybGQ"
  
  # Decode and validate HRI
  baid64 decode --expected-hri myapp "myapp:SGVsbG8gV29ybGQ"
  
  # Pipe support
  echo "Hello World" | baid64 encode
  cat data.bin | baid64 encode --hri myapp --prefix
`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function main() {
  if (!command || (command !== 'encode' && command !== 'decode')) {
    if (command === '-h' || command === '--help') {
      showHelp();
      process.exit(0);
    }
    console.error('Error: Please specify "encode" or "decode" command');
    console.error('Use "baid64 --help" for usage information');
    process.exit(1);
  }

  try {
    // Read from stdin if no input provided
    if (!input) {
      if (process.stdin.isTTY) {
        console.error('Error: No input provided');
        console.error('Use "baid64 --help" for usage information');
        process.exit(1);
      }
      input = await readStdin();
    }

    if (command === 'encode') {
      // Convert string to Buffer if needed
      const data = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
      const result = encode(data, options);
      console.log(result);
    } else if (command === 'decode') {
      const inputStr = Buffer.isBuffer(input) ? input.toString('utf8').trim() : input.trim();
      const result = decode(inputStr, options.expectedHri);
      
      // Output based on what was decoded
      if (process.stdout.isTTY) {
        // Terminal output - show structured result
        if (result.hri) {
          console.error(`HRI: ${result.hri}`);
        }
        if (result.embeddedChecksum) {
          console.error(`Checksum: ${result.embeddedChecksum.toString('hex')}`);
        }
        if (result.mnemonic) {
          console.error(`Mnemonic: ${result.mnemonic}`);
        }
        // Try to output as string if it looks like text, otherwise hex
        const payload = result.payload;
        const isText = payload.every(byte => 
          (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13
        );
        
        if (isText) {
          console.log(payload.toString('utf8'));
        } else {
          console.log(payload.toString('hex'));
        }
      } else {
        // Pipe output - just raw bytes
        process.stdout.write(result.payload);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();