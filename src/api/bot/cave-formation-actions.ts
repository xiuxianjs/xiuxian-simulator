import type { CaveFormationActivateResult, CaveFormationRemoveResult } from '../schemas/cave-formation-action';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type FormationCategory = CaveFormationActivateResult['formation']['formationCategory'];

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCategory(value: unknown): value is FormationCategory {
  return value === 'concealment' || value === 'stasis' || value === 'yield' || value === 'guard';
}

function isFormation(value: unknown): value is CaveFormationActivateResult['formation'] {
  return (
    isObject(value) &&
    typeof value.formationKey === 'string' &&
    isCategory(value.formationCategory) &&
    typeof value.formationName === 'string' &&
    typeof value.formationEffect === 'string' &&
    typeof value.expiresAt === 'string' &&
    Number.isFinite(Date.parse(value.expiresAt))
  );
}

function isActivateResult(value: unknown): value is CaveFormationActivateResult {
  if (
    !isObject(value) ||
    typeof value.outcome !== 'string' ||
    !['created', 'refreshed', 'replaced'].includes(value.outcome) ||
    typeof value.replaced !== 'boolean'
  ) {
    return false;
  }
  if (
    (value.replacedFormationName !== undefined && value.replacedFormationName !== null && typeof value.replacedFormationName !== 'string') ||
    typeof value.name !== 'string' ||
    !Number.isFinite(value.durationHours) ||
    !isFormation(value.formation)
  ) {
    return false;
  }

  return (
    (value.outcome === 'replaced') === value.replaced &&
    (value.outcome !== 'replaced' || typeof value.replacedFormationName === 'string') &&
    value.name === value.formation.formationName
  );
}

function isRemoveResult(value: unknown): value is CaveFormationRemoveResult {
  return (
    isObject(value) &&
    value.removed === true &&
    value.outcome === 'removed' &&
    value.replaced === false &&
    isCategory(value.category) &&
    typeof value.name === 'string' &&
    Number.isFinite(value.durationHours) &&
    isFormation(value.formation) &&
    value.category === value.formation.formationCategory &&
    value.name === value.formation.formationName
  );
}

function requireBid(bid: string | undefined): asserts bid is string {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
}

export async function activateBackendCaveFormation(
  bid: string | undefined,
  uid: number,
  keyword: string,
  request?: BackendRequestContext
): Promise<CaveFormationActivateResult> {
  requireBid(bid);
  const data = await requestBackend(bid, 'post_players_id_cave_formations_activate', {
    path: { id: uid },
    body: { keyword },
    ...writeContext(request)
  });

  return parseBackendCaveFormationActivation(data);
}

export function parseBackendCaveFormationActivation(data: unknown) {
  if (!isActivateResult(data)) {
    throw new Error('激活阵盘响应不完整');
  }

  return data;
}

export async function removeBackendCaveFormation(
  bid: string | undefined,
  uid: number,
  keyword: string,
  request?: BackendRequestContext
): Promise<CaveFormationRemoveResult> {
  requireBid(bid);
  const data = await requestBackend(bid, 'delete_players_id_cave_formations_category', {
    // The route name predates the migration, but Go accepts every original
    // formation keyword here.  Keep that interpretation server-side so new
    // aliases and validation never require a bot release.
    path: { id: uid, category: keyword },
    ...writeContext(request)
  });

  return parseBackendCaveFormationRemoval(data);
}

export function parseBackendCaveFormationRemoval(data: unknown) {
  if (!isRemoveResult(data)) {
    throw new Error('移除阵法响应不完整');
  }

  return data;
}

export function caveFormationKeyword(text: string, action: 'activate' | 'remove') {
  return action === 'activate' ? text.replace(/^(!|！|\/|#|＃)?激活阵盘\s*/, '').trim() : text.replace(/^(!|！|\/|#|＃)?移除阵法\s*/, '').trim();
}
