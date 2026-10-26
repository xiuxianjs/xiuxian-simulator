import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

//#region src/api/bot/hash.ts
function sha256Hex(value) {
	return bytesToHex(sha256(new TextEncoder().encode(value)));
}

//#endregion
export { sha256Hex };