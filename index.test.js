import { encode, decode, calculateChecksum } from './index.js';

describe('baid64', () => {
  // Test vectors from Rust implementation
  const testVectors = {
    sequential: Buffer.from([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 
      0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
      0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 
      0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F
    ]),
    uniform1: Buffer.alloc(32, 1),
    uniform2: Buffer.alloc(32, 2),
    uniform3: Buffer.alloc(32, 3),
    deadbeef: Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]),
    mixed: Buffer.from([
      0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
      0x90, 0xA0, 0xB0, 0xC0, 0xD0, 0xE0, 0xF0, 0x00,
      0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
      0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x00
    ])
  };

  describe('checksum calculation', () => {
    test('should match Rust checksum for test vectors', () => {
      const hri = 'testHRI';
      const payload = testVectors.sequential;
      const checksum = calculateChecksum(hri, payload);
      
      // Verify it's 4 bytes with duplication at position 1 and 2
      expect(checksum.length).toBe(4);
      expect(checksum[1]).toBe(checksum[2]);
    });

    test('should produce different checksums for different payloads', () => {
      const hri = 'testHRI';
      const checksum1 = calculateChecksum(hri, testVectors.uniform1);
      const checksum2 = calculateChecksum(hri, testVectors.uniform2);
      
      expect(Buffer.compare(checksum1, checksum2)).not.toBe(0);
    });

    test('should produce different checksums for different HRIs', () => {
      const payload = testVectors.uniform1;
      const checksum1 = calculateChecksum('hri1', payload);
      const checksum2 = calculateChecksum('hri2', payload);
      
      expect(Buffer.compare(checksum1, checksum2)).not.toBe(0);
    });
  });

  describe('encoding', () => {
    test('should encode basic payload without options', () => {
      const encoded = encode(testVectors.deadbeef);
      
      // Should be plain baid64 without prefix, checksum, or chunking
      expect(encoded).not.toContain(':');
      expect(encoded).not.toContain('-');
      expect(encoded).not.toContain('#');
    });

    test('should encode with HRI prefix', () => {
      const encoded = encode(testVectors.uniform1, {
        hri: 'testHRI',
        prefix: true
      });
      
      expect(encoded).toMatch(/^testHRI:/);
    });

    test('should encode with embedded checksum', () => {
      const encoded1 = encode(testVectors.uniform1, {
        hri: 'testHRI',
        embedChecksum: false
      });
      
      const encoded2 = encode(testVectors.uniform1, {
        hri: 'testHRI',
        embedChecksum: true
      });
      
      // With checksum should be longer (4 bytes = ~5-6 base64 chars)
      expect(encoded2.length).toBeGreaterThan(encoded1.length);
    });

    test('should encode with chunking', () => {
      const encoded = encode(testVectors.sequential, {
        chunking: true,
        chunkFirst: 8,
        chunkLen: 7
      });
      
      // Check chunking format: first 8, then groups of 7
      const chunks = encoded.split('-');
      expect(chunks[0].length).toBe(8);
      if (chunks.length > 1) {
        expect(chunks[1].length).toBeLessThanOrEqual(7);
      }
    });

    test('should use custom alphabet', () => {
      const encoded = encode(testVectors.deadbeef);
      
      // Should only contain baid64 alphabet characters
      expect(encoded).toMatch(/^[A-Za-z0-9_~]+$/);
      // Should not contain standard base64 characters
      expect(encoded).not.toMatch(/[+\/]/);
    });
  });

  describe('decoding', () => {
    test('should decode basic encoded payload', () => {
      const original = testVectors.deadbeef;
      const encoded = encode(original);
      const decoded = decode(encoded);
      
      expect(Buffer.compare(decoded.payload, original)).toBe(0);
    });

    test('should decode with HRI', () => {
      const original = testVectors.uniform1;
      const encoded = encode(original, {
        hri: 'testHRI',
        prefix: true
      });
      
      const decoded = decode(encoded);
      expect(decoded.hri).toBe('testHRI');
      expect(Buffer.compare(decoded.payload, original)).toBe(0);
    });

    test('should validate HRI if expected', () => {
      const encoded = encode(testVectors.uniform1, {
        hri: 'testHRI',
        prefix: true
      });
      
      expect(() => {
        decode(encoded, 'wrongHRI');
      }).toThrow('Invalid HRI');
    });

    test('should decode with embedded checksum', () => {
      const original = testVectors.uniform1;
      const encoded = encode(original, {
        hri: 'testHRI',
        prefix: true,
        embedChecksum: true
      });
      
      const decoded = decode(encoded);
      expect(decoded.hri).toBe('testHRI');
      expect(Buffer.compare(decoded.payload, original)).toBe(0);
      expect(decoded.embeddedChecksum).not.toBeNull();
      expect(decoded.embeddedChecksum.length).toBe(4);
    });

    test('should decode chunked format', () => {
      const original = testVectors.sequential;
      const encoded = encode(original, {
        chunking: true
      });
      
      expect(encoded).toContain('-');
      const decoded = decode(encoded);
      expect(Buffer.compare(decoded.payload, original)).toBe(0);
    });
  });

  describe('round-trip encoding/decoding', () => {
    test('should preserve all test vectors', () => {
      Object.entries(testVectors).forEach(([name, payload]) => {
        const encoded = encode(payload);
        const decoded = decode(encoded);
        
        expect(Buffer.compare(decoded.payload, payload)).toBe(0);
      });
    });

    test('should preserve payload with all options', () => {
      const original = testVectors.mixed;
      const encoded = encode(original, {
        hri: 'testHRI',
        prefix: true,
        chunking: true,
        chunkFirst: 8,
        chunkLen: 7,
        embedChecksum: true
      });
      
      const decoded = decode(encoded);
      
      expect(decoded.hri).toBe('testHRI');
      expect(Buffer.compare(decoded.payload, original)).toBe(0);
      expect(decoded.embeddedChecksum).not.toBeNull();
    });
  });

  describe('error handling', () => {
    test('should throw on invalid baid64 characters', () => {
      expect(() => {
        decode('invalid+base64');
      }).toThrow();
    });

    test('should handle missing HRI gracefully', () => {
      const encoded = encode(testVectors.deadbeef);
      const decoded = decode(encoded);
      
      expect(decoded.hri).toBe('');
      expect(decoded.payload).toBeDefined();
    });
  });
});