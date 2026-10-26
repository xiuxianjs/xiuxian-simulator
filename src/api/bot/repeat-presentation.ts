import { getCurrentEvent } from 'alemonjs';
import type { RepeatRecordData } from '../schemas/repeat-record';

type Receipt = { bid: string; uid: number; command: string; message: string; data: RepeatRecordData | null };
const receipts = new WeakMap<object, Receipt[]>();

/** Only an exact final-text match can replace the former repeat-record call. */
export function receiveRepeatPresentation(event: object | undefined, bid: string, uid: unknown, value: unknown): void {
  if (!event || !Number.isSafeInteger(uid) || Number(uid) < 1 || !value || typeof value !== 'object') {
    return;
  }
  const repeat = (value as { repeat?: unknown }).repeat;

  if (!repeat || typeof repeat !== 'object') {
    return;
  }
  const row = repeat as Record<string, unknown>;

  if (row.uid !== uid || typeof row.command !== 'string' || typeof row.message !== 'string' || typeof row.available !== 'boolean') {
    return;
  }
  if (row.available && (typeof row.count !== 'number' || !Number.isFinite(row.count) || typeof row.suffix !== 'string')) {
    return;
  }
  const data = row.available ? { count: row.count as number, suffix: row.suffix as string } : null;
  const pending = receipts.get(event) ?? [];

  pending.push({ bid, uid: Number(uid), command: row.command, message: row.message, data });
  receipts.set(event, pending);
}
export function consumeRepeatPresentation(
  bid: string | undefined,
  uid: number,
  command: string,
  message: string
): { data: RepeatRecordData | null } | undefined {
  const event = getCurrentEvent();

  if (!event || event.UserId !== bid) {
    return;
  }
  const pending = receipts.get(event);
  const index = pending?.findIndex(row => row.bid === bid && row.uid === uid && row.command === command && row.message === message) ?? -1;

  if (!pending || index < 0) {
    return;
  }
  const [row] = pending.splice(index, 1);

  return { data: row.data };
}
export function repeatPresentationHeaders(command: string | undefined): { 'X-Repeat-Command'?: string } {
  if (typeof command !== 'string' || Buffer.byteLength(command, 'utf8') > 4096) {
    return {};
  }

  return { 'X-Repeat-Command': Buffer.from(command, 'utf8').toString('base64') };
}
