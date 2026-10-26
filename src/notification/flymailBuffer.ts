import { AsyncLocalStorage } from 'node:async_hooks';
import { Format, type DataEnums } from 'alemonjs';
import type { NotificationTarget } from '@src/types/notification';

export const FLYMAIL_BUFFER_MS = 2_000;
export const FLYMAIL_BATCH_LIMIT = 5;
// 传输缓冲上限，不改变正文长度规则；超出单条按原有路径发送。
const MAX_BATCH_SIZE = 12_000;
const context = new AsyncLocalStorage<boolean>();

type Item = { data: DataEnums[]; resolve: () => void; reject: (error: unknown) => void };
type Batch = { items: Item[]; size: number; timer: ReturnType<typeof setTimeout>; send: (data: DataEnums[]) => Promise<void> };
const batches = new Map<string, Batch>();
const sending = new Map<string, Promise<void>>();

export const withFlyMailBuffer = <T>(send: () => Promise<T>): Promise<T> => context.run(true, send);

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
      }
    }
  }
  const data = batch.items.length === 1 ? batch.items[0].data : Format.create().addMarkdown(markdown).value;
  // 同对象按批发送，前一批失败不能阻止后一批；每批独立回传结果。
  const previous = sending.get(key) ?? Promise.resolve();
  const delivery = previous.catch(() => {}).then(() => batch.send(data));

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

/** 仅飞信调用链启用；实际目标相同才合并，成功/失败由所有原事件分别确认。 */
export function bufferFlyMailSend(target: NotificationTarget, data: DataEnums[], send: (data: DataEnums[]) => Promise<void>): Promise<void> {
  if (!context.getStore() || !data.every(block => block.type === 'Markdown' || block.type === 'Text')) {
    return send(data);
  }
  const size = JSON.stringify(data).length;
  const key = JSON.stringify([target.platform, target.BotId ?? '', target.scope, target.targetId]);
  let batch = batches.get(key);

  if (batch && batch.size + size > MAX_BATCH_SIZE) {
    flush(key, batch);
    batch = undefined;
  }
  if (size > MAX_BATCH_SIZE) {
    return send(data);
  }
  if (!batch) {
    const created: Batch = { items: [], size: 0, send, timer: setTimeout(() => flush(key, created), FLYMAIL_BUFFER_MS) };

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
