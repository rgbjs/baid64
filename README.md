# baid64

URL-safe Base64 encoding with checksums for identities.

## Installation

```bash
npm install baid64
```

## Usage

### Command Line Interface

```bash
# Global installation for CLI access
npm install -g baid64

# Encode text
baid64 encode "Hello World"

# Encode with options
baid64 encode --hri myapp --prefix --chunking "Hello World"
# Output: myapp:SGVsbG8g-V29ybGQ

# Decode
baid64 decode "SGVsbG8gV29ybGQ"
# Output: Hello World

# Pipe support
echo "Hello World" | baid64 encode
cat data.bin | baid64 encode --hri myapp --embed-checksum

# File input
baid64 encode -f data.bin --hri myapp --prefix

# Help
baid64 --help
```

#### CLI Options

- `--hri <id>` - Human Readable Identifier
- `--prefix` - Include HRI prefix in output  
- `--chunking` - Enable hyphen formatting
- `--chunk-first <n>` - First chunk size (default: 8)
- `--chunk-len <n>` - Subsequent chunk sizes (default: 7)
- `--embed-checksum` - Embed checksum in encoded data
- `--expected-hri <hri>` - Validate HRI when decoding
- `-f, --file <path>` - Read input from file

### ES Modules

```javascript
import { encode, decode, calculateChecksum } from 'baid64';

// Basic encoding
const data = Buffer.from('Hello World');
const encoded = encode(data);
console.log(encoded); // URL-safe base64 string

// Encoding with options
const encoded = encode(data, {
  hri: 'myapp',        // Human Readable Identifier
  prefix: true,        // Include HRI prefix (myapp:...)
  chunking: true,      // Add hyphens for readability
  chunkFirst: 8,       // First chunk size
  chunkLen: 7,         // Subsequent chunk sizes
  embedChecksum: true  // Embed checksum in data
});

// Decoding
const result = decode(encoded);
console.log(result.payload);        // Original data as Buffer
console.log(result.hri);           // Extracted HRI
console.log(result.embeddedChecksum); // Checksum if present
```

### CommonJS

```javascript
const { encode, decode } = require('baid64');

// Same API as ES modules
const encoded = encode(Buffer.from('Hello World'));
```

## API

### `encode(payload, options)`

Encodes a Buffer or Uint8Array to baid64 format.

**Parameters:**
- `payload` (Buffer | Uint8Array): Data to encode
- `options` (Object, optional):
  - `hri` (string): Human Readable Identifier prefix
  - `prefix` (boolean): Include HRI in output (default: false)
  - `chunking` (boolean): Format with hyphens (default: false)
  - `chunkFirst` (number): First chunk size (default: 8)
  - `chunkLen` (number): Subsequent chunk sizes (default: 7)
  - `embedChecksum` (boolean): Embed checksum in data (default: false)

**Returns:** String - The encoded baid64 string

### `decode(baid64Str, expectedHri)`

Decodes a baid64 string back to its original data.

**Parameters:**
- `baid64Str` (string): The baid64 encoded string
- `expectedHri` (string, optional): Validate against expected HRI

**Returns:** Object with:
- `payload` (Buffer): The decoded data
- `hri` (string): Extracted HRI or empty string
- `embeddedChecksum` (Buffer | null): Embedded checksum if present
- `mnemonic` (string): Mnemonic suffix if present

### `calculateChecksum(hri, payload)`

Calculates a 4-byte checksum for the given HRI and payload.

**Parameters:**
- `hri` (string): Human Readable Identifier
- `payload` (Buffer): Data to checksum

**Returns:** Buffer - 4-byte checksum

## Features

- **URL-safe alphabet**: Uses `_` and `~` instead of `+` and `/`
- **Optional checksums**: Detect transmission errors
- **Human-readable prefixes**: Context identification with HRI
- **Chunking**: Improves readability with hyphen separators
- **Dual module support**: Works with both ES modules and CommonJS

## Differences from Standard Base64

baid64 uses a custom alphabet where:
- `_` replaces `+`
- `~` replaces `/`
- No padding characters (`=`)

## Differences from Base64url (RFC 4648)

While Base64url is also URL-safe, baid64 differs in several ways:

| Feature | Base64url | baid64 |
|---------|-----------|--------|
| **Alphabet** | `A-Za-z0-9-_` | `A-Za-z0-9_~` |
| **URL-unsafe chars** | `-` and `_` | `_` and `~` |
| **Padding** | Optional `=` | None |
| **Checksums** | None | Optional SHA-256 based |
| **Human prefixes** | None | HRI (Human Readable Identifier) |
| **Chunking** | None | Optional hyphen formatting |
| **Error detection** | None | 32-bit checksum + mnemonic words |

**Key differences:**
- **Different alphabet**: baid64 uses `~` instead of Base64url's `-` 
- **Built-in checksums**: Detect transmission/transcription errors
- **Human-readable features**: HRI prefixes and mnemonic checksums for voice/manual verification
- **Structured formatting**: Chunking support for improved readability

## License

Apache-2.0

## Contributing

Pull requests and issues are welcome on [GitHub](https://github.com/rgbjs/baid64).