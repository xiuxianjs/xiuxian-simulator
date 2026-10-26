import type { DungeonSweep } from '@src/api/bot/dungeon-sweep';
import { displayCurrencyText } from '@src/constants/currency';

type ParsedCommand = { ok: true; dungeonName: string; times: number } | { ok: false; isCommand: boolean; message: string };
export function parseSweepCommand(text: string): ParsedCommand {
  const cleaned = (text ?? '').trim().replace(/^(!|！|\/|#|＃)?\s*/, '');

  if (!cleaned.startsWith('扫荡秘境')) {
    return { ok: false, isCommand: false, message: '' };
  }
  const match = cleaned.match(/^扫荡秘境\s+(.+?)(?:\s+(\d+))?$/);

  if (!match) {
    return { ok: false, isCommand: true, message: '用法：/扫荡秘境 名称 [次数]' };
  }
  const dungeonName = match[1].trim(),
    times = match[2] ? Number(match[2]) : 1;

  if (!dungeonName) {
    return { ok: false, isCommand: true, message: '请输入秘境名称' };
  }
  if (![1, 5, 10].includes(times)) {
    return { ok: false, isCommand: true, message: '扫荡次数仅支持 1、5、10' };
  }

  return { ok: true, dungeonName, times };
}
export interface SweepData {
  dungeonName: string;
  times: number;
  totalSpiritCost: number;
  totalExp: number;
  totalCurrencyText: string;
  totalItemsText: string;
}

export function dungeonSweepView(value: DungeonSweep): SweepData {
  return {
    dungeonName: value.dungeonName,
    times: value.times,
    totalSpiritCost: value.totalSpiritCost,
    totalExp: value.totalExp,
    totalCurrencyText: value.currency.map(r => `${displayCurrencyText(r.name)} +${r.amount}`).join(' | '),
    totalItemsText: value.items.map(r => `${r.name}×${r.amount}`).join('、')
  };
}
