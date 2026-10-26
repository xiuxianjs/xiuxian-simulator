import { randomUUID } from 'node:crypto';
import { Format } from 'alemonjs';
import { FormatGui, normalizeFooterRows, type GuiButton } from './messageHelper';
import type { useMessage } from './useMessage';

export const battleMemoryUrl = (recordId: string): string => `https://tatian-online.alemonjs.com/components/battle-memory/${encodeURIComponent(recordId)}`;

type BattleEntry = { id?: string | null; label?: string };
type MemoryEntry = { id: string; label?: string };
type GuiParams = Parameters<typeof FormatGui>[0];
// 仅缓存展示数据，不保存或重新执行战斗。限制生命周期和批次数，避免无限增长。
const batches = new Map<string, { entries: MemoryEntry[]; bid?: string; expiresAt: number }>();
const batchLifetime = 30 * 60 * 1000;

function memoryPage(entries: MemoryEntry[], token?: string, page = 1): GuiButton[][] {
  const paginated = entries.length > 15;
  const size = paginated ? 12 : 15;
  const rows: GuiButton[][] = [];
  const visible = entries.slice((page - 1) * size, page * size);

  for (let index = 0; index < visible.length; index += 3) {
    rows.push(
      visible.slice(index, index + 3).map(battle => ({
        label: battle.label ?? '查看战斗回忆',
        command: battleMemoryUrl(battle.id),
        type: 'link'
      }))
    );
  }
  if (paginated && token) {
    const navigation: GuiButton[] = [];

    if (page > 1) {
      navigation.push({ label: '上一页', command: `/战斗回忆翻页 ${token} ${page - 1}` });
    }
    if (page * size < entries.length) {
      navigation.push({ label: '下一页', command: `/战斗回忆翻页 ${token} ${page + 1}` });
    }
    rows.push(navigation);
  }

  return rows;
}

export function battleMemoryPage(token: string, page: number, bid?: string) {
  const batch = batches.get(token);

  if (!batch || batch.expiresAt <= Date.now()) {
    batches.delete(token);

    return undefined;
  }
  if (batch.bid !== bid || !Number.isSafeInteger(page) || page < 1 || page > Math.ceil(batch.entries.length / 12)) {
    return undefined;
  }

  return FormatGui({
    bid,
    title: '战斗回忆',
    content: Format.createMarkdown().addText(`第${page}/${Math.ceil(batch.entries.length / 12)}页 · 共${batch.entries.length}场`),
    keyboard: memoryPage(batch.entries, token, page),
    bar: false
  });
}

/** 单场保留原入口；多场使用独立消息，防止 QQ 五行上限截断按钮。 */
export async function sendBattleResult(message: ReturnType<typeof useMessage>[0], params: GuiParams, battles: BattleEntry[]) {
  const entries = battles.filter(battle => Boolean(battle.id));

  if (entries.length <= 1) {
    return message.send(await BattleFormatGui(params, entries));
  }
  await message.send(FormatGui(params));

  return message.send(await BattleFormatGui({ isPrivate: params.isPrivate, bid: params.bid, title: '战斗回忆', bar: false }, entries));
}

/** Explicit battle-only augmentation; ordinary Gui commands retain their semantics. */
export function BattleFormatGui(params: GuiParams, battles: BattleEntry[]) {
  const entries = battles.filter((battle): battle is MemoryEntry => Boolean(battle.id));
  let token: string | undefined;

  if (entries.length > 15) {
    for (const [key, batch] of batches) {
      if (batch.expiresAt <= Date.now()) {
        batches.delete(key);
      }
    }
    while (batches.size >= 1024) {
      batches.delete(batches.keys().next().value!);
    }
    token = randomUUID();
    batches.set(token, { entries, bid: params.bid, expiresAt: Date.now() + batchLifetime });
  }
  const rows = params.keyboard ? [...normalizeFooterRows(params.keyboard)] : [];

  rows.push(...memoryPage(entries, token));

  return Promise.resolve(FormatGui({ ...params, keyboard: rows, ...(entries.length > 1 ? { bar: false } : {}) }));
}
