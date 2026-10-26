import { parseBackendGlossaryApply } from './glossary-apply';
import { parseBackendGlossaryUpsert } from './glossary-upsert';
import { parseBackendGlossaryDelete } from './glossary-delete';
import { parseGlossaryView } from './market-community-views';

export const GLOSSARY_APPLY_REASON_MAX_LENGTH = 100;

export function parseApplyParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const reason = raw.replace(/^(!|！|\/|#|＃)?申请词典编辑权限\s*/, '').trim();

  return {
    reason: reason || ''
  };
}

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

/** 解析删除参数 */
export function parseDeleteParams(messageText: string) {
  const raw = (messageText ?? '').trim();

  return raw.replace(/^(!|！|\/|#|＃)?删除词典\s*/, '').trim();
}

export function parseRobotGlossaryApply(value: unknown) {
  const data = parseBackendGlossaryApply(value);

  if (data.outcome !== 'submitted') {
    throw new Error('词典申请响应不完整');
  }

  return { success: true as const };
}
export function parseRobotGlossaryDelete(value: unknown) {
  const data = parseBackendGlossaryDelete(value);

  if (data.outcome !== 'deleted') {
    throw new Error('词典删除响应不完整');
  }

  return { success: true as const, forbidden: false as const, reason: '' };
}
export function parseRobotGlossaryUpsert(value: any) {
  if (value?.mode === 'help') {
    const view = parseGlossaryView(value.view, 'edit_context');

    if (!view.quota?.allowed || !view.quota.withinLimit || !view.policy) {
      throw new Error('词典帮助响应不完整');
    }

    return { mode: 'help' as const, view, result: null };
  }
  if (value?.mode !== 'write') {
    throw new Error('词典录入响应不完整');
  }
  const result = parseBackendGlossaryUpsert(value.result);

  if (!['created', 'updated'].includes(result.outcome)) {
    throw new Error('词典录入响应不完整');
  }

  return { mode: 'write' as const, view: null, result: { ...result, success: true } };
}
