import type { ParameterSchema } from './runtime';
import { SDKError } from './error';

export function fail(message: string, requestId?: string): never {
  throw new SDKError(message, { code: 'SDK_INVALID_REQUEST', requestId });
}

export function headerValue(value: string, name: string, requestId?: string): string {
  if (typeof value !== 'string' || !value.trim() || /[^\x20-\x7e]/.test(value) || value.length > 128) {
    fail(`${name} must be non-empty printable ASCII and at most 128 characters`, requestId);
  }

  return value;
}

export const protectedHeaders = new Set(['authorization', 'x-bid', 'x-worker-token', 'x-request-id', 'idempotency-key', 'cookie', 'host', 'content-type']);
export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function redact(value: unknown, secret: string | undefined): unknown {
  if (!secret) {
    return value;
  }
  if (typeof value === 'string') {
    return value.split(secret).join('[REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.map(item => redact(item, secret));
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item, secret)]));
  }

  return value;
}

/** Path/query containers must be plain key-value records, not arrays or class instances. */
export function isParameterRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function parameterScalar(value: unknown, name: string, requestId: string): string {
  if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
    return String(value);
  }

  return fail(`Invalid scalar parameter ${name}`, requestId);
}

// setTimeout uses a signed 32-bit millisecond delay; larger values may fire immediately.
export function isValidTimeout(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 2_147_483_647;
}

export function validateParameter(value: unknown, schema: ParameterSchema | undefined, name: string, requestId: string): void {
  if (!schema) {
    return;
  }
  const invalid = () => fail(`Invalid parameter ${name}`, requestId);

  switch (schema.type) {
    case 'integer':
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        invalid();
      }
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        invalid();
      }
      break;
    case 'string':
      if (typeof value !== 'string') {
        invalid();
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        invalid();
      }
      break;
  }
  if (typeof value === 'number' && ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) {
    invalid();
  }
  if (typeof value === 'string') {
    const length = Array.from(value).length;

    if ((schema.minLength !== undefined && length < schema.minLength) || (schema.maxLength !== undefined && length > schema.maxLength)) {
      invalid();
    }
  }
  if (schema.enum && !schema.enum.some(option => option === value)) {
    invalid();
  }
}
