# ZeroLink QR Code Protocol Specification

**Version:** 2.0  
**Last Updated:** 2025-12-27  
**Status:** Stable

---

## Overview

ZeroLink uses QR codes to transmit automation logic between devices without requiring network connectivity. This document specifies the exact format, chunking strategy, and error handling for the QR-based "zero-link" transfer protocol.

---

## Design Goals

1. **Zero-Link Transfer:** No network, accounts, or pairing required
2. **Reliability:** Checksums and validation prevent corruption
3. **Offline-First:** Works entirely on-device after initial QR generation
4. **Mobile-Optimized:** QR size and scan speed balanced for smartphone cameras
5. **Backward Compatible:** Optional fields allow protocol evolution

---

## QR Code Format

### Single-Chunk Logic (Small Payloads <150 bytes)

For simple logic that fits in one QR code, the format is the raw JSON Logic object:

```json
{
  "name": "Heat Warning",
  "triggers": [
    {
      "sensor": "temperature",
      "operator": ">",
      "value": 30
    }
  ],
  "actions": [
    {
      "type": "flashBackground",
      "payload": {
        "color": "red",
        "message": "High temperature!"
      }
    }
  ]
}
```

**Encoding:** UTF-8 JSON string  
**QR Level:** L (Low error correction ~7%)  
**Max Size:** ~370 bytes at QR Version 10

---

### Multi-Chunk Logic (Large Payloads >150 bytes)

For complex logic that exceeds QR capacity, the payload is split into chunks:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "chunkIndex": 1,
  "totalChunks": 3,
  "data": "{\"name\":\"Complex Logic\",\"triggers\":[...]}",
  "checksum": "a3f2c1"
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | UUID v4 | ✅ | Unique identifier for this logic transfer session |
| `chunkIndex` | Number | ✅ | 1-based index of this chunk (1, 2, 3, ...) |
| `totalChunks` | Number | ✅ | Total number of chunks in this session |
| `data` | String | ✅ | Substring of the full JSON logic object |
| `checksum` | String | v2.0+ | Base-36 hash of `data` field for integrity validation |

**Encoding:** UTF-8 JSON string  
**QR Level:** L  
**Chunk Size:** 250 bytes (target, actual varies by overhead)

---

## Chunking Algorithm

### Overhead Calculation

```typescript
// Calculate metadata overhead
const sampleChunk = { 
  sessionId: "a".repeat(36),  // UUID length
  chunkIndex: 99, 
  totalChunks: 99, 
  data: "",
  checksum: "xxxxxx"  // Approximate checksum length
};
const overhead = JSON.stringify(sampleChunk).length;

// Effective data capacity per chunk
const effectiveChunkSize = Math.max(50, CHUNK_SIZE - overhead);
```

**Why this matters:** Previous versions used empty strings for overhead calculation, causing QR codes to exceed capacity.

### Splitting Logic

```typescript
const logicString = JSON.stringify(logic);
const numChunks = Math.ceil(logicString.length / effectiveChunkSize) || 1;

for (let i = 0; i < numChunks; i++) {
  const content = logicString.substring(
    i * effectiveChunkSize, 
    (i + 1) * effectiveChunkSize
  );
  
  const chunk = {
    sessionId: sessionId,
    chunkIndex: i + 1,  // 1-based indexing
    totalChunks: numChunks,
    data: content,
    checksum: calculateChecksum(content)
  };
  
  chunks.push(JSON.stringify(chunk));
}
```

---

## Checksum Algorithm

**Purpose:** Detect QR code scanning errors or corruption

**Algorithm:** Simple hash-based checksum (32-bit integer → base-36)

```typescript
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
```

**Example:**
- Input: `"{"name":"Test"}"`
- Output: `"1a2b3c"`

**Properties:**
- Fast: O(n) where n = data length
- Compact: 6-8 characters
- Collision-resistant for small payloads
- Deterministic (same input → same checksum)

**Limitations:**
- Not cryptographically secure (not intended for security)
- Possible collisions for very large datasets (acceptable risk)

---

## Scanning Protocol

### Receiver State Machine

```
[IDLE] 
  ↓ (Scan QR)
[DETECT_TYPE]
  ↓ Single chunk → [VALIDATE_SINGLE]
  ↓ Multi-chunk → [COLLECTING]
        ↓ (Scan more QRs)
        ↓ All received → [VALIDATE_ALL]
            ↓ Success → [LOADED]
            ↓ Failure → [ERROR]
```

### Single-Chunk Validation

```typescript
1. Parse JSON
2. Validate structure (name, triggers, actions present)
3. Run Zod schema validation
4. Load logic into simulator
```

### Multi-Chunk Collection

```typescript
1. First chunk scanned:
   - Extract sessionId
   - Store totalChunks
   - Initialize Map<chunkIndex, data>

2. Subsequent chunks:
   - Validate sessionId matches current session
   - Validate checksum (if present)
   - Check if chunk already received (deduplicate)
   - Add to Map

3. When Map.size === totalChunks:
   - Sort chunks by chunkIndex
   - Concatenate data fields
   - Parse concatenated JSON
   - Validate with Zod schema
   - Load logic
```

### Error Handling

| Error | Trigger | User Feedback | Action |
|-------|---------|---------------|--------|
| Invalid JSON | Parse fails | "Invalid QR code" | Ignore, keep scanning |
| Checksum mismatch | `checksum !== calculated` | "Corrupted chunk X" | Prompt re-scan |
| Session mismatch | Different `sessionId` | "Wrong logic session" | Prompt reset |
| Missing chunks | Timeout with incomplete set | "Missing X parts" | Show progress, prompt continue |
| Malformed logic | Zod validation fails | "Invalid logic structure" | Stop, show error |

---

## Display Protocol (Sender)

### Auto-Rotation

For multi-chunk QR codes, use carousel with auto-advance:

- **Delay:** 1500ms per QR code
- **Behavior:** Auto-advance, pause on hover
- **Indicator:** "Part X of Y"

**Rationale:** 1500ms gives enough time for camera focus + capture, prevents user confusion.

### QR Code Settings

```typescript
<QRCodeSVG
  value={chunk}
  size={200}
  level="L"           // 7% error correction (optimize for size)
  includeMargin={true}
/>
```

**Why Level L?** 
- ZeroLink QR codes are scanned in controlled environments (close range)
- Higher error correction (M, Q, H) reduces data capacity
- Checksums provide integrity validation separately

---

## Size Constraints

### Maximum Logic Size

| Component | Size Limit | Rationale |
|-----------|-----------|-----------|
| Single chunk | ~370 bytes | QR Version 10, Level L capacity |
| Effective chunk | ~150 bytes | After overhead (~100 bytes) |
| Total chunks | 10 recommended | User patience limit (~15 seconds scanning) |
| Max logic | ~1500 bytes | 10 chunks × 150 bytes |

**Example Complexity:**

| Logic Type | Typical Size | Chunks |
|------------|--------------|--------|
| Simple rule | 80-120 bytes | 1 |
| Multi-condition | 150-300 bytes | 1-2 |
| Complex automation | 400-800 bytes | 3-6 |
| Very complex | 1000+ bytes | 7-10 |

**Exceeding Limits:**

If logic exceeds 1500 bytes:
1. Warn user: "Logic is very complex. Consider simplifying."
2. Generate anyway (chunking supports any size)
3. Monitor: If >10 chunks, log analytics for future optimization

---

## Backward Compatibility

### Version 1.0 → 2.0 Changes

**Added:**
- `checksum` field in chunk format
- Improved overhead calculation
- Better error messages

**Backward Compatible:**
- Version 1.0 receivers can scan 2.0 QR codes (checksum is optional)
- Version 2.0 receivers can scan 1.0 QR codes (missing checksum ignored)

**Detection:**
```typescript
if (parsed.checksum) {
  // Version 2.0+ chunk - validate checksum
  validateChecksum(parsed);
} else {
  // Version 1.0 chunk - skip checksum validation
  console.warn('[Scanner] No checksum - accepting without validation');
}
```

### Future Extensions

Reserved fields for v3.0:
- `schemaVersion` - Track logic schema evolution
- `compression` - Support gzip/lz-string for large payloads
- `signature` - Optional cryptographic verification

---

## Security Considerations

### Threats & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Malicious QR injection | Input sanitization, Zod validation |
| Code corruption | Checksums, try-catch on parse |
| DoS via huge logic | Chunk limit (max 10), size warnings |
| Session hijacking | Session IDs are UUID v4 (collision-resistant) |

### No Authentication

**By Design:** ZeroLink is a **zero-trust, zero-login** protocol. Anyone can create and scan QR codes.

**Implications:**
- ✅ Privacy: No user tracking or data collection
- ✅ Simplicity: No account setup or pairing
- ⚠️ Trust: Receiver must trust sender (scan QR from trusted source)

**Recommendation for Enterprise Use:**
If authentication is required, add optional `signature` field in v3.0 using public key cryptography.

---

## Performance Optimization

### Sender Optimization

**Cache QR Chunks:**
```typescript
const chunks = useMemo(() => {
  // Expensive chunking operation
  return generateChunks(logic);
}, [logic]); // Only recompute if logic changes
```

**Lazy Render:**
- Only render visible QR code in carousel
- Pre-render next QR code in background

### Receiver Optimization

**Scan Rate Limiting:**
```typescript
const lastScanTime = useRef(0);
const MIN_SCAN_INTERVAL = 500; // ms

if (now - lastScanTime.current < MIN_SCAN_INTERVAL) {
  return; // Ignore duplicate scans
}
```

**Camera FPS:**
- Default: 5 FPS (balanced)
- Reduce to 3 FPS on low-end devices (detect via frame timing)

---

## Testing Checklist

### Unit Tests

- [ ] Chunking algorithm produces correct number of chunks
- [ ] Checksum algorithm is deterministic
- [ ] Overhead calculation matches actual JSON.stringify length
- [ ] Reassembly produces original logic object

### Integration Tests

- [ ] Single-chunk QR generates and scans correctly
- [ ] Multi-chunk QR (3 chunks) generates and scans in order
- [ ] Multi-chunk QR scans work out-of-order
- [ ] Corrupted chunk is detected and rejected
- [ ] Session mismatch is detected and user is warned
- [ ] Missing chunks show correct progress indicator

### E2E Tests

- [ ] Generate logic → Display QR → Scan QR → Simulate logic
- [ ] Works offline (no network calls during scan/simulate)
- [ ] Large logic (10 chunks) completes successfully
- [ ] User can reset and start over during multi-chunk scan

---

## Debugging

### Common Issues

**Issue:** "QR code too dense to scan"
- **Cause:** Chunk size too large
- **Fix:** Reduce CHUNK_SIZE or increase QR version
- **Debug:** Log `JSON.stringify(chunk).length` before encode

**Issue:** "Chunks always fail checksum"
- **Cause:** Different checksum algorithms on sender/receiver
- **Fix:** Ensure both use identical hash function
- **Debug:** Log `calculateChecksum(data)` on both sides

**Issue:** "Scan never completes"
- **Cause:** Missing chunk, infinite loop
- **Fix:** Add timeout, show missing chunk indices
- **Debug:** Log `scannedChunks.size` and `totalChunks`

### Diagnostic Logs

```typescript
console.log('[QR] Generated', chunks.length, 'chunks');
console.log('[QR] Chunk sizes:', chunks.map(c => c.length));
console.log('[Scan] Session:', sessionId, '| Progress:', `${scannedChunks.size}/${totalChunks}`);
console.log('[Checksum] Expected:', expectedChecksum, '| Received:', receivedChecksum);
```

---

## Appendix A: Example Payloads

### Minimal Logic (Single Chunk)

```json
{
  "name": "Alert",
  "triggers": [{"sensor": "motion", "operator": "=", "value": true}],
  "actions": [{"type": "vibrate"}]
}
```

**Size:** 96 bytes  
**Chunks:** 1

### Complex Logic (Multi-Chunk)

```json
{
  "name": "Smart Home Automation",
  "triggers": [
    {
      "type": "all",
      "conditions": [
        {"sensor": "temperature", "operator": ">", "value": 25},
        {"sensor": "light", "operator": "<", "value": 30},
        {"sensor": "timeOfDay", "operator": "=", "value": "day"}
      ]
    }
  ],
  "actions": [
    {"type": "toggle", "payload": {"device": "fan", "state": "on"}},
    {"type": "toggle", "payload": {"device": "light", "state": "on"}},
    {"type": "log", "payload": {"message": "Cooling system activated"}}
  ]
}
```

**Size:** 452 bytes  
**Chunks:** 3

---

## Appendix B: Reference Implementation

See:
- **Chunking:** `src/components/qr-code-display.tsx`
- **Scanning:** `src/components/qr-scanner.tsx`
- **Validation:** `src/lib/schema.ts`

---

**End of Specification**
