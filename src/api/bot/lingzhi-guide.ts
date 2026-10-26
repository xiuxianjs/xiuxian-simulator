import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { LingzhiGuideSession, LingzhiGuideState } from '../schemas/lingzhi-guide';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function requireBid(bid: string | undefined): asserts bid is string {
  if (!bid?.trim()) {
    throw new Error('操作缺少平台身份');
  }
}

function parseSession(value: unknown): LingzhiGuideSession {
  if (!isRecord(value)) {
    throw new Error('灵药师引导响应不完整');
  }

  const valid =
    [1, 2, 3, 4].includes(value.step as number) &&
    Number.isInteger(value.createTime) &&
    Number.isInteger(value.expireTime) &&
    Number.isInteger(value.version) &&
    (value.version as number) >= 1;

  if (!valid) {
    throw new Error('灵药师引导响应不完整');
  }

  return {
    step: value.step as LingzhiGuideSession['step'],
    createTime: value.createTime as number,
    expireTime: value.expireTime as number,
    version: value.version as number
  };
}

export function parseLingzhiGuideState(value: unknown): LingzhiGuideState {
  if (!isRecord(value) || typeof value.completed !== 'boolean') {
    throw new Error('灵药师引导响应不完整');
  }
  const activation = isRecord(value.activation) && typeof value.activation.message === 'string' ? { message: value.activation.message } : undefined;

  if (value.session === undefined || value.session === null) {
    return { completed: value.completed, ...(activation ? { activation } : {}) };
  }

  return { session: parseSession(value.session), completed: value.completed };
}

export async function startBackendLingzhiGuide(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<LingzhiGuideState> {
  requireBid(bid);

  return parseLingzhiGuideState(
    await requestBackend(bid, 'post_players_id_professions_lingzhi_guide_start', {
      path: { id: uid },
      headers: repeatPresentationHeaders(repeatCommand),
      ...writeContext(request)
    })
  );
}

export async function continueCurrentBackendLingzhiGuide(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<LingzhiGuideState> {
  requireBid(bid);

  return parseLingzhiGuideState(
    await requestBackend(bid, 'post_players_id_professions_lingzhi_guide_continue_current', {
      path: { id: uid },
      headers: repeatPresentationHeaders(repeatCommand),
      ...writeContext(request)
    })
  );
}
