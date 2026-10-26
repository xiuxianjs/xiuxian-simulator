import { getBackendGlossaryEditQuota, getBackendGlossaryPolicy, upsertBackendGlossary } from '@src/api/bot/glossary-upsert';
import type { BackendRequestContext } from '@src/api/bot/context';

export const checkEditQuota = getBackendGlossaryEditQuota;
export const getGlossaryPolicy = getBackendGlossaryPolicy;

/** 解析录入参数 */
export function parseCreateParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const stripped = raw.replace(/^(!|！|\/|#|＃)?录入词典\s*/, '');

  if (!stripped) {
    return { empty: true as const };
  }

  const firstSpaceIdx = stripped.search(/\s/);
  let keyword: string;
  let rest: string;

  if (firstSpaceIdx === -1) {
    keyword = stripped;
    rest = '';
  } else {
    keyword = stripped.slice(0, firstSpaceIdx);
    rest = stripped.slice(firstSpaceIdx + 1).replace(/^\s+/, '');
  }

  if (!rest) {
    return { empty: false as const, noContent: true as const, keyword };
  }

  return { empty: false as const, noContent: false as const, keyword, content: rest };
}

export async function createEntry(params: { keyword: string; content: string; bid: string | undefined }, request?: BackendRequestContext) {
  const result = await upsertBackendGlossary(params.bid, params.keyword, params.content, request);

  return { ...result, success: result.outcome === 'created' || result.outcome === 'updated' };
}
