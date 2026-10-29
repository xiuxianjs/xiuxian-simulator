import type { NewcomerGuideActionResult } from '../api/schemas/newcomer-guide';
import { boolean, integer, list, object, text } from './schema';

export const guideSchema = object(
  {
    action: text,
    presentation: object({ title: text, heading: text, text, showActionBar: boolean, advice: list(object({ command: text, description: text })) }),
    progress: object({ step: integer, version: integer, expiresAt: text }, ['step', 'expiresAt']),
    preparation: object({
      alreadyPrepared: boolean,
      experience: integer,
      requiredExperience: integer,
      materials: list(object({ itemId: integer, itemName: text, quantity: integer })),
      cacheInvalidationPending: boolean
    }),
    promotion: object({ success: boolean, message: text, newRealm: object({ name: text }, ['name']) }, ['newRealm']),
    completion: object({ alreadyClaimed: boolean, renameCards: integer, sexChangeCards: integer, spiritCrystals: integer, cacheInvalidationPending: boolean }),
    detailsIncomplete: boolean
  },
  ['progress', 'preparation', 'promotion', 'completion']
);

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const safeIntegers = (row: Record<string, unknown>, keys: string[]) => keys.every(key => Number.isSafeInteger(row[key]));
const booleans = (row: Record<string, unknown>, keys: string[]) => keys.every(key => typeof row[key] === 'boolean');
const absent = (value: unknown) => value === null || value === undefined;

/** Optional details cannot invalidate an already committed guide action. */
export function projectGuideReceipt(guide: NewcomerGuideActionResult) {
  const value = guide as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { action: guide.action, presentation: guide.presentation, detailsIncomplete: false };
  const keep = (key: string, valid: (row: Record<string, unknown>) => boolean) => {
    const entry = value[key];

    if (entry === undefined || entry === null) {
      return;
    }
    if (record(entry) && valid(entry)) {
      out[key] = entry;
    } else {
      out.detailsIncomplete = true;
    }
  };

  keep(
    'progress',
    row => safeIntegers(row, ['version']) && (absent(row.step) || Number.isSafeInteger(row.step)) && (absent(row.expiresAt) || typeof row.expiresAt === 'string')
  );
  keep(
    'preparation',
    row => booleans(row, ['alreadyPrepared', 'cacheInvalidationPending']) &&
      safeIntegers(row, ['experience', 'requiredExperience']) &&
      Array.isArray(row.materials) &&
      row.materials.every(item => record(item) && safeIntegers(item, ['itemId', 'quantity']) && typeof item.itemName === 'string')
  );
  keep(
    'promotion',
    row => booleans(row, ['success']) &&
      typeof row.message === 'string' &&
      (absent(row.newRealm) || (record(row.newRealm) && (row.newRealm.name === undefined || typeof row.newRealm.name === 'string')))
  );
  keep(
    'completion',
    row => booleans(row, ['alreadyClaimed', 'cacheInvalidationPending']) && safeIntegers(row, ['renameCards', 'sexChangeCards', 'spiritCrystals'])
  );

  return out;
}
