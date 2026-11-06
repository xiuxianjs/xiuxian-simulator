import { createHash } from 'node:crypto';
import { BackendAPIError } from './client';
import { getBackendConfig } from './config';

const catalogs = new Set(['base.grades', 'base.equipment-types', 'base.skill-types', 'base.realms', 'base.alchemy-recipes', 'base.forge-recipes']);
const realmFields = [
  'id',
  'name',
  'level',
  'stageLevel',
  'spiritualPower',
  'speed',
  'magicDefense',
  'physicalDefense',
  'magicAttack',
  'physicalAttack',
  'hp',
  'experienceLimit',
  'attributePoints',
  'maxStrength',
  'maxIntelligence',
  'maxConstitution',
  'maxAgility',
  'maxLuck'
];
const versionPattern = /^c1_[0-9a-f]{64}$/;
const invalid = (): never => {
  throw new BackendAPIError('公开目录缓存响应无效，请重新查询', 'SDK_INVALID_RESPONSE');
};

type Entry = { version: string; json: string; bytes: number; expires: number };
type Page = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  version?: string;
  enabled?: boolean;
  entryRealmId?: number;
};

function publicRecipe(value: Record<string, unknown>, forge: boolean) {
  const integers = forge
    ? ['recipeId', 'outputEquipmentId', 'requiredLevel', 'craftRequiredLevel', 'spiritStoneCost', 'baseExp', 'configuredToolGrade', 'toolGrade']
    : ['recipeId', 'requiredLevel', 'fireDemand', 'furnaceDemand', 'baseExp', 'regularItemId', 'excellentItemId', 'outputQuantity'];
  const strings = forge ? ['name', 'toolType'] : [];
  const booleans = forge ? ['assessment', 'earlyCraft'] : [];

  if (
    integers.some(key => !Number.isSafeInteger(value[key])) ||
    strings.some(key => typeof value[key] !== 'string') ||
    booleans.some(key => typeof value[key] !== 'boolean') ||
    !Array.isArray(value.materials)
  ) {
    return invalid();
  }
  const materials = value.materials.map((material: unknown) => {
    if (!material || typeof material !== 'object' || Array.isArray(material)) {
      return invalid();
    }
    const row = material as Record<string, unknown>;

    if (!Number.isSafeInteger(row.itemId) || !Number.isSafeInteger(row.quantity)) {
      return invalid();
    }

    return { itemId: row.itemId, quantity: row.quantity };
  });

  // Select public fields at every level, including legacy full responses.
  return { ...Object.fromEntries([...integers, ...strings, ...booleans].map(key => [key, value[key]])), materials };
}

function publicPage(data: Record<string, unknown>, operation: string, page: number, pageSize: number): Page {
  const fields =
    operation === 'base.realms'
      ? realmFields
      : operation === 'base.grades'
        ? ['id', 'name', 'category', 'level', 'realmId']
        : operation === 'base.equipment-types'
          ? ['id', 'name', 'category', 'isCraftable']
          : ['id', 'name'];

  if (
    data.page !== page ||
    data.pageSize !== pageSize ||
    !Number.isSafeInteger(data.total) ||
    Number(data.total) < 0 ||
    !Array.isArray(data.items) ||
    data.items.length > pageSize ||
    data.items.length > Number(data.total)
  ) {
    return invalid();
  }
  const items = data.items.map((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return invalid();
    }
    const value = row as Record<string, unknown>;

    if (operation === 'base.alchemy-recipes' || operation === 'base.forge-recipes') {
      return publicRecipe(value, operation === 'base.forge-recipes');
    }

    if (
      Object.keys(value).length !== fields.length ||
      fields.some(key => {
        if (key === 'name' || key === 'category') {
          return typeof value[key] !== 'string';
        }
        if (key === 'isCraftable') {
          return typeof value[key] !== 'boolean';
        }

        return !Number.isSafeInteger(value[key]) || (key === 'id' && Number(value[key]) < 1) || (key === 'realmId' && Number(value[key]) < 0);
      })
    ) {
      return invalid();
    }

    return Object.fromEntries(fields.map(key => [key, value[key]]));
  });

  const result: Page = { items, total: Number(data.total), page, pageSize };

  if (operation === 'base.alchemy-recipes') {
    if (typeof data.version !== 'string' || !data.version) {
      return invalid();
    }
    result.version = data.version;
  } else if (operation === 'base.forge-recipes') {
    if (typeof data.enabled !== 'boolean' || !Number.isSafeInteger(data.entryRealmId)) {
      return invalid();
    }
    result.enabled = data.enabled;
    result.entryRealmId = Number(data.entryRealmId);
  }

  return result;
}

// Retention only: every use revalidates with the server after admission. No
// cache hit is allowed to bypass the normal business request or its envelope.
export class PublicCatalogCache {
  private entries = new Map<string, Entry>();
  private bytes = 0;

  constructor(
    private readonly limits = { entries: 128, bytes: 4 * 1024 * 1024, entryBytes: 256 * 1024, retentionMs: 5 * 60_000 },
    private readonly now = Date.now
  ) {}

  prepare(scope: string, operation: string, args: Record<string, unknown>) {
    if (
      !catalogs.has(operation) ||
      Object.keys(args).some(key => key !== 'page' && key !== 'pageSize') ||
      !Number.isInteger(args.page) ||
      Number(args.page) < 1 ||
      Number(args.page) > 21474836 ||
      !Number.isInteger(args.pageSize) ||
      Number(args.pageSize) < 1 ||
      Number(args.pageSize) > 100
    ) {
      return undefined;
    }
    const page = Number(args.page),
      pageSize = Number(args.pageSize);
    const key = JSON.stringify([scope, operation, page, pageSize]);

    const now = this.now();

    for (const [id, entry] of this.entries) {
      if (entry.expires <= now) {
        this.remove(id);
      }
    }
    // Hold the exact advertised copy even if another request evicts/replaces it.
    const prior = this.entries.get(key);

    if (prior) {
      this.entries.delete(key);
      this.entries.set(key, prior);
    }

    return {
      arguments: { ...args, knownVersion: prior?.version ?? '' },
      decode: <T>(value: unknown, decode: (data: unknown) => T): T => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return invalid();
        }
        const data = value as Record<string, unknown>;

        if (data.catalogNotModified !== undefined) {
          if (data.catalogNotModified !== true || !prior || data.catalogVersion !== prior.version || Object.keys(data).length !== 2) {
            return invalid();
          }

          return decode(JSON.parse(prior.json));
        }
        const publicData = publicPage(data, operation, page, pageSize);
        const version = data.catalogVersion;

        // A full legacy response is usable but cannot seed versioned storage.
        if (version !== undefined && (typeof version !== 'string' || !versionPattern.test(version))) {
          return invalid();
        }
        const json = JSON.stringify(publicData);
        const result = decode(publicData);

        if (typeof version === 'string') {
          const bytes = Buffer.byteLength(json);

          this.remove(key);
          if (bytes <= this.limits.entryBytes && bytes <= this.limits.bytes && this.limits.entries > 0) {
            while (this.entries.size >= this.limits.entries || this.bytes + bytes > this.limits.bytes) {
              this.remove(this.entries.keys().next().value!);
            }
            this.entries.set(key, { version, json, bytes, expires: this.now() + this.limits.retentionMs });
            this.bytes += bytes;
          }
        }

        return result;
      }
    };
  }

  private remove(key: string) {
    const entry = this.entries.get(key);

    if (entry) {
      this.bytes -= entry.bytes;
      this.entries.delete(key);
    }
  }
}

const publicCatalogCache = new PublicCatalogCache();

export function preparePublicCatalogRequest(operation: string, args: Record<string, unknown>) {
  if (!catalogs.has(operation)) {
    return undefined;
  }
  const config = getBackendConfig();
  // Credentials are only an isolation input, never a plain-text key or log.
  const scope = createHash('sha256')
    .update(JSON.stringify([config.url, config.channelMode, config.channelBotId, config.robotAuthToken]))
    .digest('hex');

  return publicCatalogCache.prepare(scope, operation, args);
}
