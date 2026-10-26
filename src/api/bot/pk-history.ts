import { parseGameTime } from '@src/utils/gameTime';

export const pkHistoryScopes = { all: '全部', attacks: '我发起', defenses: '我被打', pending: '未决' } as const;
export type PKHistoryScope = keyof typeof pkHistoryScopes;
export function pkHistoryScope(value?: string): PKHistoryScope | null {
  if (value === undefined) {
    return 'all';
  }

  return (Object.entries(pkHistoryScopes).find(([key, label]) => key === value || label === value)?.[0] as PKHistoryScope | undefined) ?? null;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('PK战报格式不完整');
  }

  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error('PK战报数值无效');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('PK战报文本不完整');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('PK战报资格不完整');
  }

  return value;
}
function date(value: unknown): string {
  const result = text(value);

  if (!parseGameTime(result)) {
    throw new Error('PK战报时间无效');
  }

  return result;
}
export function parsePKHistoryEntry(value: unknown) {
  const row = record(value);

  if (row.viewerRole !== 'attacker' && row.viewerRole !== 'victim') {
    throw new Error('PK战报身份无效');
  }
  const canCounterAttack = boolean(row.canCounterAttack);

  if (row.viewerRole === 'attacker' && canCounterAttack) {
    throw new Error('原攻击方不应获得免费反击');
  }

  return {
    reportId: integer(row.reportId, 1),
    viewerRole: row.viewerRole,
    opponentUid: integer(row.opponentUid, 1),
    opponentName: text(row.opponentName),
    createdAt: date(row.createdAt),
    resultText: text(row.resultText),
    moneyText: text(row.moneyText),
    originalAssetText: text(row.originalAssetText),
    counterStatusText: text(row.counterStatusText),
    canCounterAttack,
    counterDeadline: row.counterDeadline === undefined ? undefined : date(row.counterDeadline)
  };
}
export function parsePKHistory(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.items)) {
    throw new Error('PK历史缺少列表');
  }

  return { items: data.items.map(parsePKHistoryEntry), nextCursor: data.nextCursor === undefined ? undefined : integer(data.nextCursor, 1) };
}
export function parsePKReport(value: unknown) {
  const data = record(value);

  return { summary: parsePKHistoryEntry(data.summary), hasOrdinaryReplay: boolean(data.hasOrdinaryReplay), hasCounterReplay: boolean(data.hasCounterReplay) };
}
export function parsePKReplay(value: unknown) {
  const data = record(value);

  if (data.phase !== 'ordinary' && data.phase !== 'counter') {
    throw new Error('PK回放阶段无效');
  }
  const page = integer(data.page, 1);
  const totalPages = integer(data.totalPages, 1);

  if (page > totalPages) {
    throw new Error('PK回放页码无效');
  }

  return { summary: parsePKHistoryEntry(data.summary), phase: data.phase, page, totalPages, totalActions: integer(data.totalActions), text: text(data.text) };
}
