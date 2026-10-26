import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;
export type WudaoOption = {
  key: string;
  label: string;
  isPercent: boolean;
  currentMax: number;
  templateMax: number;
  currentMaxText: string;
  templateMaxText: string;
};
export type WudaoOptions = {
  skillBookId: number;
  skillBookName: string;
  ownedStones: number;
  status: 'ready' | 'no_stone' | 'no_record' | 'no_attrs';
  message: string;
  options: WudaoOption[];
};
export type WudaoResult = {
  skillBookId: number;
  skillBookName: string;
  key: string;
  label: string;
  isPercent: boolean;
  oldMax: number;
  newMax: number;
  templateMax: number;
  growth: number;
  remaining: number;
  growthText: string;
  newMaxText: string;
  templateMaxText: string;
};

function row(value: unknown, message: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
}
function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`悟道响应字段无效: ${field}`);
  }

  return value;
}
function text(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`悟道响应字段无效: ${field}`);
  }

  return value;
}
function positive(value: unknown, field: string): number {
  const result = number(value, field);

  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error(`悟道响应字段无效: ${field}`);
  }

  return result;
}
function valid(bid: string | undefined, uid: number, skillBookId: number): asserts bid is string {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(skillBookId) || skillBookId <= 0) {
    throw new Error('悟道参数无效');
  }
}
export async function getBackendWudaoOptions(bid: string | undefined, uid: number, skillBookId: number): Promise<WudaoOptions> {
  valid(bid, uid, skillBookId);
  const data = row(await requestBackend(bid, 'get_players_id_skill_books_skillBookId_wudao_options', { path: { id: uid, skillBookId } }), '悟道候选响应不完整');

  return parseWudaoOptions(data);
}

export function parseWudaoOptions(value: unknown): WudaoOptions {
  const data = row(value, '悟道候选响应不完整');

  if (!Array.isArray(data.options)) {
    throw new Error('悟道候选响应不完整');
  }

  const status = text(data.status, 'status');

  if (status !== 'ready' && status !== 'no_stone' && status !== 'no_record' && status !== 'no_attrs') {
    throw new Error('悟道候选响应不完整');
  }

  return {
    skillBookId: positive(data.skillBookId, 'skillBookId'),
    skillBookName: text(data.skillBookName, 'skillBookName'),
    ownedStones: number(data.ownedStones, 'ownedStones'),
    status,
    message: data.message === undefined ? '' : text(data.message, 'message'),
    options: data.options.map(value => {
      const option = row(value, '悟道候选响应不完整');

      if (typeof option.isPercent !== 'boolean') {
        throw new Error('悟道候选响应不完整');
      }

      return {
        key: text(option.key, 'option.key'),
        label: text(option.label, 'option.label'),
        isPercent: option.isPercent,
        currentMax: number(option.currentMax, 'option.currentMax'),
        templateMax: number(option.templateMax, 'option.templateMax'),
        currentMaxText: text(option.currentMaxText, 'option.currentMaxText'),
        templateMaxText: text(option.templateMaxText, 'option.templateMaxText')
      };
    })
  };
}
export async function wudaoBackendSkillBook(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  attribute: string,
  request?: BackendRequestContext
): Promise<WudaoResult> {
  valid(bid, uid, skillBookId);
  if (!attribute.trim()) {
    throw new Error('该属性不可悟道。');
  }
  const data = row(
    await requestBackend(bid, 'post_players_id_skill_books_skillBookId_wudao', {
      path: { id: uid, skillBookId },
      body: { attribute },
      ...writeContext(request)
    }),
    '悟道结算响应不完整'
  );

  return parseWudaoResult(data);
}

export function parseWudaoResult(value: unknown): WudaoResult {
  const data = row(value, '悟道结算响应不完整');

  if (typeof data.isPercent !== 'boolean') {
    throw new Error('悟道结算响应不完整');
  }

  return {
    skillBookId: positive(data.skillBookId, 'skillBookId'),
    skillBookName: text(data.skillBookName, 'skillBookName'),
    key: text(data.key, 'key'),
    label: text(data.label, 'label'),
    isPercent: data.isPercent,
    oldMax: number(data.oldMax, 'oldMax'),
    newMax: number(data.newMax, 'newMax'),
    templateMax: number(data.templateMax, 'templateMax'),
    growth: number(data.growth, 'growth'),
    remaining: number(data.remaining, 'remaining'),
    growthText: text(data.growthText, 'growthText'),
    newMaxText: text(data.newMaxText, 'newMaxText'),
    templateMaxText: text(data.templateMaxText, 'templateMaxText')
  };
}

export async function commandBackendWudao(bid: string | undefined, uid: number, skillBookId: number, label: string, request?: BackendRequestContext) {
  valid(bid, uid, skillBookId);
  const data = row(
    await requestBackend(bid, 'post_players_id_skill_books_skillBookId_wudao_command', {
      path: { id: uid, skillBookId },
      body: { label },
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    }),
    '悟道响应不完整'
  );

  if (typeof data.failure !== 'string') {
    throw new Error('悟道响应不完整');
  }

  return { options: parseWudaoOptions(data.options), result: data.result === null ? null : parseWudaoResult(data.result), failure: data.failure };
}
