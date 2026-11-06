import { notificationNavigationData } from './presentation';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Format, type DataEnums } from 'alemonjs';
import type { NotificationTarget } from '@src/types/notification';

export const FLYMAIL_BUFFER_MS = 2_000;
export const FLYMAIL_BATCH_LIMIT = 5;
// 传输缓冲上限，不改变正文长度规则；超出单条按原有路径发送。
const MAX_BATCH_SIZE = 12_000;
const context = new AsyncLocalStorage<string>();

export const NOTIFICATION_BUFFER_MS = 30_000;
/** 仅保存传输缓冲，权威事件及回执仍在服务端。玩家隔离避免同群串合并。 */
export const withNotificationBuffer = <T>(owner: string, send: () => Promise<T>): Promise<T> => context.run(`standard:${owner}`, send);

type Item = { data: DataEnums[]; resolve: () => void; reject: (error: unknown) => void };
type Batch = { items: Item[]; size: number; timer: ReturnType<typeof setTimeout>; send: (data: DataEnums[]) => Promise<void> };
const batches = new Map<string, Batch>();
const sending = new Map<string, Promise<void>>();

export const withFlyMailBuffer = <T>(send: () => Promise<T>): Promise<T> => context.run('flymail', send);

function flush(key: string, batch: Batch): void {
  if (batches.get(key) !== batch) {
    return;
  }
  batches.delete(key);
  clearTimeout(batch.timer);
  const markdown = Format.createMarkdown();

  for (const [index, item] of batch.items.entries()) {
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
  const data = batch.items.length === 1 ? batch.items[0].data : Format.create().addMarkdown(markdown).value;
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
  const mode = context.getStore();

  if (!mode) {
    return send(data);
  }
  if (!data.every(block => block.type === 'Markdown' || block.type === 'Text' || block.type === 'Mention')) {
    return send(notificationNavigationData(data));
  }
  const size = JSON.stringify(data).length;
  const key = JSON.stringify([target.platform, target.BotId ?? '', target.scope, target.targetId, mode]);
  let batch = batches.get(key);

  if (batch && batch.size + size > MAX_BATCH_SIZE) {
    flush(key, batch);
    batch = undefined;
  }
  if (size > MAX_BATCH_SIZE) {
    return send(notificationNavigationData(data));
  }
  if (!batch) {
    const created: Batch = {
      items: [],
      size: 0,
      send,
      timer: setTimeout(() => flush(key, created), mode === 'flymail' ? FLYMAIL_BUFFER_MS : NOTIFICATION_BUFFER_MS)
    };

    batches.set(key, created);
    batch = created;
  }
  const current = batch;
  const result = new Promise<void>((resolve, reject) => current.items.push({ data, resolve, reject }));

  current.size += size;
  if (current.items.length >= FLYMAIL_BATCH_LIMIT) {
    flush(key, current);
  }

  return result;
}
