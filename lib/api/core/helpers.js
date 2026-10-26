import { SDKError } from "./error.js";

//#region src/api/core/helpers.ts
function fail(message, requestId) {
	throw new SDKError(message, {
		code: "SDK_INVALID_REQUEST",
		requestId
	});
}
function headerValue(value, name, requestId) {
	if (typeof value !== "string" || !value.trim() || /[^\x20-\x7e]/.test(value) || value.length > 128) fail(`${name} must be non-empty printable ASCII and at most 128 characters`, requestId);
	return value;
}
const protectedHeaders = /* @__PURE__ */ new Set([
	"authorization",
	"x-bid",
	"x-worker-token",
	"x-request-id",
	"idempotency-key",
	"cookie",
	"host",
	"content-type"
]);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function redact(value, secret) {
	if (!secret) return value;
	if (typeof value === "string") return value.split(secret).join("[REDACTED]");
	if (Array.isArray(value)) return value.map((item) => redact(item, secret));
	if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item, secret)]));
	return value;
}
/** Path/query containers must be plain key-value records, not arrays or class instances. */
function isParameterRecord(value) {
	return isRecord(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function parameterScalar(value, name, requestId) {
	if (typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return String(value);
	return fail(`Invalid scalar parameter ${name}`, requestId);
}
function isValidTimeout(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 2147483647;
}
function validateParameter(value, schema, name, requestId) {
	if (!schema) return;
	const invalid = () => fail(`Invalid parameter ${name}`, requestId);
	switch (schema.type) {
		case "integer":
			if (typeof value !== "number" || !Number.isSafeInteger(value)) invalid();
			break;
		case "number":
			if (typeof value !== "number" || !Number.isFinite(value)) invalid();
			break;
		case "string":
			if (typeof value !== "string") invalid();
			break;
		case "boolean": if (typeof value !== "boolean") invalid();
	}
	if (typeof value === "number" && (schema.minimum !== void 0 && value < schema.minimum || schema.maximum !== void 0 && value > schema.maximum)) invalid();
	if (typeof value === "string") {
		const length = Array.from(value).length;
		if (schema.minLength !== void 0 && length < schema.minLength || schema.maxLength !== void 0 && length > schema.maxLength) invalid();
	}
	if (schema.enum && !schema.enum.some((option) => option === value)) invalid();
}

//#endregion
export { fail, headerValue, isParameterRecord, isRecord, isValidTimeout, parameterScalar, protectedHeaders, redact, validateParameter };