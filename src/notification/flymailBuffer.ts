import { notificationNavigationData } from './presentation';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Format, type DataEnums } from 'alemonjs';
import type { NotificationTarget } from '@src/types/notification';

export const FLYMAIL_BUFFER_MS = 2_000;
export const FLYMAIL_BATCH_LIMIT = 5;
// 传输缓冲上限，不改变正文长度规则；超出单条按原有路径发送。
const MAX_BATCH_SIZE = 12_000;
const context = new AsyncLocalStorage<{ mode: string; reminderBid?: string }>();

export const NOTIFICATION_BUFFER_MS = 30_000;
/** 仅保存传输缓冲，权威事件及回执仍在服务端。玩家隔离避免同群串合并。 */
export const withNotificationBuffer = <T>(owner: string, send: () => Promise<T>): Promise<T> => context.run({ mode: `standard:${owner}` }, send);

type Item = { data: DataEnums[]; reminderBid?: string; resolve: () => void; reject: (error: unknown) => void };
type Batch = { items: Item[]; size: number; timer: ReturnType<typeof setTimeout>; send: (data: DataEnums[]) => Promise<void> };
const batches = new Map<string, Batch>();
const sending = new Map<string, Promise<void>>();

export const withFlyMailBuffer = <T>(send: () => Promise<T>): Promise<T> => context.run({ mode: 'flymail' }, send);

/** 群提醒单独按实际群合并，保留飞信私聊的原有缓冲方式。 */
export const withFlyMailGroupReminder = <T>(bid: string, send: () => Promise<T>): Promise<T> => context.run({ mode: context.getStore()?.mode === 'flymail' ? 'flymail-group' : '', reminderBid: bid }, send);

function addReminderMentions(data: DataEnums[], bids: string[]): DataEnums[] {
  const markdown = Format.createMarkdown();

  for (const [index, bid] of [...new Set(bids)].entries()) {
    if (index) {
      markdown.addText(' ');
    }
    markdown.addMention(bid);
  }

  return [...Format.create().addMarkdown(markdown.addNewline()).value, ...data];
}

function batchData(items: Item[]): DataEnums[] {
  const first = items[0];

  if (first.reminderBid) {
    return addReminderMentions(
      first.data,
      items.map(item => item.reminderBid).filter(bid => bid !== undefined)
    );
  }
  if (items.length === 1) {
    return first.data;
  }
  const markdown = Format.createMarkdown();

  for (const [index, item] of items.entries()) {
    if (index) {
      markdown.addNewline().addNewline();
    }
    for (const block of item.data) {
      if (block.type === 'Markdown') {
        markdown.value.value.push(...block.value);
      } else if (block.type === 'Text') {
        markdown.addText(block.value);
      } else if (block.type === 'Mention') {
        markdown.addMention(block.value);
      }
    }
  }

  return Format.create().addMarkdown(markdown).value;
}

function flush(key: string, batch: Batch): void {
  if (batches.get(key) !== batch) {
    return;
  }
  batches.delete(key);
  clearTimeout(batch.timer);
  const data = batchData(batch.items);

  // 同对象按批发送，前一批失败不能阻止后一批；每批独立回传结果。
  const previous = sending.get(key) ?? Promise.resolve();
  const delivery = previous.catch(() => {}).then(() => batch.send(notificationNavigationData(data)));

  sending.set(key, delivery);
  void delivery
    .then(
      () => batch.items.forEach(item => item.resolve()),
      error => batch.items.forEach(item => item.reject(error))
    )
    .finally(() => {
      if (sending.get(key) === delivery) {
        sending.delete(key);
      }
    });
}

/** 仅通知消费链启用；按玩家和实际目标合并，所有原事件分别确认。 */
export function bufferFlyMailSend(target: NotificationTarget, data: DataEnums[], send: (data: DataEnums[]) => Promise<void>): Promise<void> {
  const { mode, reminderBid } = context.getStore() ?? {};
  const singleData = () => (reminderBid ? addReminderMentions(data, [reminderBid]) : data);

  if (!mode) {
    return send(singleData());
  }
  if (!data.every(block => block.type === 'Markdown' || block.type === 'Text' || block.type === 'Mention')) {
    return send(notificationNavigationData(singleData()));
  }
  const serialized = JSON.stringify(data);
  const size = serialized.length + (reminderBid?.length ?? 0);
  const key = JSON.stringify([target.platform, target.BotId ?? '', target.scope, target.targetId, mode, reminderBid ? serialized : '']);
  let batch = batches.get(key);

  if (batch && batch.size + size > MAX_BATCH_SIZE) {
    flush(key, batch);
    batch = undefined;
  }
  if (size > MAX_BATCH_SIZE) {
    return send(notificationNavigationData(singleData()));
  }
  if (!batch) {
    const created: Batch = {
      items: [],
      size: 0,
      send,
      timer: setTimeout(() => flush(key, created), mode.startsWith('flymail') ? FLYMAIL_BUFFER_MS : NOTIFICATION_BUFFER_MS)
    };

    batches.set(key, created);
    batch = created;
  }
  const current = batch;
  const result = new Promise<void>((resolve, reject) => current.items.push({ data, reminderBid, resolve, reject }));

  current.size += size;
  if (current.items.length >= FLYMAIL_BATCH_LIMIT) {
    flush(key, current);
  }

  return result;
}
