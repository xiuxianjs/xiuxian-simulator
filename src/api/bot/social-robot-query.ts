import { BackendAPIError } from './client';

export function parseGuardedSocialQuery<T>(value: unknown, decode: (value: unknown) => T) {
  const invalid = (): never => {
    throw new BackendAPIError('社交组合响应不完整', 'SDK_INVALID_RESPONSE');
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid();
  }
  const row = value as Record<string, unknown>;

  if (!row.access || typeof row.access !== 'object' || Array.isArray(row.access)) {
    return invalid();
  }
  const raw = row.access as Record<string, unknown>;

  if (typeof raw.canUseFifthLayerFeature !== 'boolean' || typeof raw.canUseSpar !== 'boolean' || typeof raw.realmName !== 'string') {
    return invalid();
  }
  const access = { ok: raw.canUseFifthLayerFeature, realmName: raw.realmName || '未知', canUseSpar: raw.canUseSpar };

  if (!access.ok) {
    if (row.data !== null) {
      return invalid();
    }

    return { access, data: null };
  }

  return { access, data: decode(row.data) };
}

// An empty command still passes admission and the old fifth-layer check before
// its local format prompt; no mutation is performed and data is null.
export function parseGuardedSocialAction<T>(value: unknown, decode: (value: unknown) => T) {
  return parseGuardedSocialQuery(value, data => (data === null ? null : decode(data)));
}
