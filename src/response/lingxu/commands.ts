/** QQ only validates command shape. Ownership, frozen plans and settlement remain server-authoritative. */
export type LingxuCommand = { readOnly: boolean; confirmationCommand?: string } | { error: true };

const shortID = /^[A-Za-z0-9_-]{1,32}$/;
const regionKey = /^[a-z][a-z0-9_-]{0,23}$/;
const placeName = /^[\p{Script=Han}·]{2,24}$/u;
const attitude = /^(战斗|友善|躲避)$/;

export const lingxuMapTiers = ['外围', '内围', '核心'] as const;
export const lingxuJournalFilters = ['与人', '与怪', '探索', '赶路', '其他'] as const;
const natural = (value: string | undefined, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return false;
  }
  const number = Number(value);

  return Number.isSafeInteger(number) && number <= max;
};
const uid = (value: string | undefined) => value !== undefined && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;

// Only confirmation uses an opaque reference; the server validates the original operation.
export const validLingxuReference = (value: string): boolean => value.length <= 60 && /^r1_[0-9a-z]+_lx_[0-9a-z]+_[0-9a-f]{24}$/.test(value);

/** Only exact domain entries consume an event; unrelated packages continue their chain. */
export function parseLingxuCommand(message: string): LingxuCommand | undefined {
  const match = /^\s*[/#＃!！]?(灵墟洞天|阵法师)(?:\s+(.*?))?\s*$/u.exec(message);

  if (!match) {
    return undefined;
  }
  const words = (match[2] ?? '').split(/\s+/).filter(Boolean);
  const [action, arg, value] = words;
  const error = { error: true } as const;
  const read = { readOnly: true } as const;
  const write = { readOnly: false } as const;

  if ([...message.trim()].length > 80) {
    return error;
  }
  if (words.length === 0) {
    return read;
  }
  if (action === '确认') {
    return words.length === 2 && validLingxuReference(arg) ? { readOnly: false, confirmationCommand: `/${match[1]} 确认 ${arg}` } : error;
  }
  if (match[1] === '阵法师') {
    if (words.length === 1 && ['入门', '引星', '摹纹'].includes(action)) {
      return write;
    }
    if (words.length === 1 && ['图谱', '卸下', '终止预览'].includes(action)) {
      return read;
    }
    if (action === '阵盘' && (words.length === 1 || (words.length === 2 && natural(arg, 1000000)))) {
      return read;
    }
    if (['制盘预览', '路线'].includes(action) && words.length === 2 && /^(daoyun|shenxing|guixu|(?:道蕴|神行|归墟)(?:阵盘)?)$/.test(arg)) {
      return read;
    }
    if (['装备', '激活预览'].includes(action) && words.length === 2 && shortID.test(arg)) {
      return read;
    }
    if (action === '升级预览' && shortID.test(arg ?? '') && (words.length === 2 || (words.length === 3 && value === '最高'))) {
      return read;
    }

    return error;
  }
  if (words.length === 1 && ['简介', '玩法', '入门', '入场', '行动倾向', '倾向', '返程设置', '行囊升级', '推送设置', '出口', '拾取'].includes(action)) {
    return read;
  }
  if (action === '推送设置' && words.length === 2 && ['本群', '私聊', '关闭'].includes(arg)) {
    return write;
  }
  if (words.length === 1 && ['返程', '隐匿', '继续'].includes(action)) {
    return write;
  }
  if (action === '地图' && words.length === 2 && lingxuMapTiers.some(tier => tier === arg)) {
    return read;
  }
  if (action === '行记' && lingxuJournalFilters.some(filter => filter === arg) && (words.length === 2 || (words.length === 3 && natural(value, 1000000)))) {
    return read;
  }
  if (['地图', '行囊', '行记', '提取回执'].includes(action) && (words.length === 1 || (words.length === 2 && natural(arg, 1000000)))) {
    return read;
  }
  if (action === '记录' && words.length === 2 && shortID.test(arg)) {
    return read;
  }
  if (
    action === '倾向' &&
    words.length === 3 &&
    ((arg === '行动' && /^(激进|保守|谨慎)$/.test(value)) || (/^(对人|对怪)$/.test(arg) && attitude.test(value)))
  ) {
    return write;
  }
  if (action === '对人' && uid(arg)) {
    if (words.length === 2) {
      return read;
    }

    return words.length === 3 && (attitude.test(value) || value === '默认') ? write : error;
  }
  if ((action === '前往' || action === '撤离') && words.length === 2 && (regionKey.test(arg) || placeName.test(arg))) {
    return write;
  }
  if (action === '返程设置') {
    if (words.length === 2 && arg === '关闭') {
      return write;
    }
    if (words.length === 3 && (arg === '时长' || arg === '格数') && natural(value)) {
      return write;
    }
  }
  if (action === '保护' && shortID.test(arg ?? '')) {
    return words.length === 2 ? read : words.length === 3 && natural(value, 1000000) ? write : error;
  }
  if (action === '取消保护' && words.length === 2 && shortID.test(arg)) {
    return write;
  }
  if (action === '丢弃' && shortID.test(arg ?? '') && (words.length === 2 || (words.length === 3 && natural(value, 1000000)))) {
    return read;
  }
  if (action === '扩容预览' && (words.length === 1 || (words.length === 2 && arg === '最高'))) {
    return read;
  }

  return error;
}
