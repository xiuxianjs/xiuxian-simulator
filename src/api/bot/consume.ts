import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { Operations } from '../registry';

export type BackendConsumeResult = {
  outcome: 'consumed' | 'rejected' | 'formation_activated' | 'tower_reset' | 'peiyuan_pending' | 'mingwu_select';
  message: string;
  remainingQuantity?: number;
  pending?: unknown;
};

export type BackendPeiyuanPending = {
  snapshot?: string;
  quantity: number;
  view: {
    headingText: string;
    hasChanges: boolean;
    changeLines: string[];
    showRollDetails: boolean;
    rollLines: string[];
    confirmPromptText: string;
  };
};

export type BackendMingwuSelection = {
  quantity: number;
  remainingCount: number;
  guidanceText: string;
  books: { skillBookId: number; name: string; proficiency: number; canSelect: boolean; statusText: string }[];
};

const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const positiveInteger = (value: unknown): value is number => integer(value) && value > 0;
const nonNegativeInteger = (value: unknown): value is number => integer(value) && value >= 0;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('消耗道具响应不完整');
  }

  return value as Record<string, unknown>;
}

export function parsePeiyuanPending(value: unknown): BackendPeiyuanPending {
  const pending = record(value);
  const view = record(pending.view);

  if (
    !positiveInteger(pending.quantity) ||
    typeof view.headingText !== 'string' ||
    typeof view.hasChanges !== 'boolean' ||
    !Array.isArray(view.changeLines) ||
    view.changeLines.some(line => typeof line !== 'string') ||
    view.hasChanges !== view.changeLines.length > 0 ||
    typeof view.showRollDetails !== 'boolean' ||
    !Array.isArray(view.rollLines) ||
    view.rollLines.some(line => typeof line !== 'string') ||
    view.showRollDetails !== view.rollLines.length > 0 ||
    typeof view.confirmPromptText !== 'string' ||
    (pending.quantity > 1 && view.headingText.length === 0)
  ) {
    throw new Error('培元丹待确认响应不完整');
  }

  if (pending.snapshot !== undefined && (typeof pending.snapshot !== 'string' || !/^[a-f0-9]{64}$/.test(pending.snapshot))) {
    throw new Error('培元丹原预览摘要无效');
  }

  return pending as BackendPeiyuanPending;
}

export function parseMingwuSelection(value: unknown): BackendMingwuSelection {
  const data = record(value);

  if (!positiveInteger(data.quantity) || !nonNegativeInteger(data.remainingCount) || typeof data.guidanceText !== 'string' || !Array.isArray(data.books)) {
    throw new Error('明悟丹待选择响应不完整');
  }
  for (const value of data.books) {
    const book = record(value);

    if (
      !positiveInteger(book.skillBookId) ||
      typeof book.name !== 'string' ||
      !integer(book.proficiency) ||
      typeof book.canSelect !== 'boolean' ||
      typeof book.statusText !== 'string'
    ) {
      throw new Error('明悟丹待选择响应不完整');
    }
  }

  return data as BackendMingwuSelection;
}

/** The endpoint resolves inventory, template and effect server-side. */
type ConsumeInput = Operations['post_players_id_consume']['body'];

export async function consumeBackendItem(
  bid: string | undefined,
  uid: number,
  input: ConsumeInput,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendConsumeResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const value = await requestBackend(bid, 'post_players_id_consume', {
    path: { id: uid },
    body: input,
    headers: repeatPresentationHeaders(repeatCommand),
    ...writeContext(request)
  });

  return parseConsumeResult(value);
}

export function parseConsumeResult(input: unknown): BackendConsumeResult {
  const value = record(input);

  if (
    typeof value.outcome !== 'string' ||
    !['consumed', 'rejected', 'formation_activated', 'tower_reset', 'peiyuan_pending', 'mingwu_select'].includes(value.outcome) ||
    typeof value.message !== 'string'
  ) {
    throw new Error('消耗道具响应不完整');
  }
  if (value.remainingQuantity !== undefined && !nonNegativeInteger(value.remainingQuantity)) {
    throw new Error('消耗道具响应不完整');
  }

  return value as BackendConsumeResult;
}
