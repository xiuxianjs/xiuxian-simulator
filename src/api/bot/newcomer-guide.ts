import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { NewcomerGuideActionResult, NewcomerGuideProgress } from '../schemas/newcomer-guide';

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

function isGuideProgress(data: unknown): data is NewcomerGuideProgress {
  return (
    object(data) &&
    typeof data.version === 'number' &&
    Number.isSafeInteger(data.version) &&
    data.version >= 0 &&
    data.expiresAt === null &&
    (data.step === null || (typeof data.step === 'number' && [2, 3, 4, 5].includes(data.step)))
  );
}

function requireGuideProgress(data: NewcomerGuideProgress): NewcomerGuideProgress {
  if (!isGuideProgress(data)) {
    throw new Error('新手引导状态接口返回不完整，请更新服务端后重试');
  }

  return data;
}

export async function getBackendNewcomerGuide(bid: string, uid: number, request?: BackendRequestContext): Promise<NewcomerGuideProgress> {
  return requireGuideProgress(await requestBackend(bid, 'get_players_id_guides_newcomer', { path: { id: uid }, requestId: request?.requestId }));
}

function requireGuideAction(data: NewcomerGuideActionResult): NewcomerGuideActionResult {
  if (
    !object(data) ||
    !['step-3', 'step-4', 'step-5', 'promotion-failed', 'completed', 'skipped', 'cleared'].includes(data.action) ||
    !isGuideProgress(data.progress) ||
    !object(data.presentation) ||
    typeof data.presentation.title !== 'string' ||
    typeof data.presentation.heading !== 'string' ||
    typeof data.presentation.text !== 'string' ||
    (data.action !== 'cleared' && data.presentation.text.length === 0) ||
    typeof data.presentation.showActionBar !== 'boolean' ||
    !Array.isArray(data.presentation.advice) ||
    !data.presentation.advice.every(tip => object(tip) && typeof tip.command === 'string' && typeof tip.description === 'string')
  ) {
    throw new Error('新手引导动作接口返回不完整，请更新服务端后重试');
  }

  return data;
}

export async function continueBackendNewcomerGuide(
  bid: string,
  uid: number,
  expectedVersion: number,
  request: BackendRequestContext
): Promise<NewcomerGuideActionResult> {
  return requireGuideAction(
    await requestBackend(bid, 'post_players_id_guides_newcomer_continue', {
      path: { id: uid },
      body: { expectedVersion },
      ...writeContext(request)
    })
  );
}

export async function skipBackendNewcomerGuide(
  bid: string,
  uid: number,
  expectedVersion: number,
  request: BackendRequestContext
): Promise<NewcomerGuideActionResult> {
  return requireGuideAction(
    await requestBackend(bid, 'post_players_id_guides_newcomer_skip', {
      path: { id: uid },
      body: { expectedVersion },
      ...writeContext(request)
    })
  );
}
