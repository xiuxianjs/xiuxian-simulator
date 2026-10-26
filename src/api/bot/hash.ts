import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

// Preserve the synchronous UTF-8 SHA-256 contract used by existing event keys
// and BID cohorts, without importing Node built-ins into the public entry.
export function sha256Hex(value: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(value)));
}
