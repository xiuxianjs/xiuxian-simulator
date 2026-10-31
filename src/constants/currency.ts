import { formatNumber } from '../utils/formatHelper';
export const CURRENCY_CODE_LIST = ['SPIRIT_STONE', 'SPIRIT_CRYSTAL', 'SPIRIT_MILK', 'REPUTATION', 'CHECKIN_COIN', 'TOWER_SCORE', 'TONGXIN'] as const;
export type CurrencyCode = (typeof CURRENCY_CODE_LIST)[number];

export const CURRENCY_NAME_MAP: Record<CurrencyCode, string> = {
  SPIRIT_STONE: '灵石',
  SPIRIT_CRYSTAL: '灵晶',
  SPIRIT_MILK: '道晶',
  REPUTATION: '声望',
  CHECKIN_COIN: '签到币',
  TOWER_SCORE: '积分',
  TONGXIN: '同心值'
};

/**
 * 将货币编码转换为中文名称
 * @param code 货币编码，可能值：'SPIRIT_STONE' | 'SPIRIT_CRYSTAL' | 'SPIRIT_MILK'
 * @returns 对应的中文名称（如 '灵石'）
 */
export const toCurrencyName = (code: CurrencyCode): string => CURRENCY_NAME_MAP[code];

const CURRENCY_DISPLAY_NAMES: Record<string, string> = {
  ...CURRENCY_NAME_MAP,
  SPIRITS_CRYSTAL: '灵晶',
  SPIRITS_MILK: '道晶',
  SIGN_IN_COIN: '签到币'
};
const CURRENCY_DISPLAY_PATTERN = new RegExp(`\\b(?:${Object.keys(CURRENCY_DISPLAY_NAMES).join('|')})\\b`, 'gi');

/** 仅在气泡展示时转换已知货币编码；接口数据与未知编码保持原样。 */
export const displayCurrencyText = (value: string): string => {
  const text = value.replace(CURRENCY_DISPLAY_PATTERN, code => CURRENCY_DISPLAY_NAMES[code.toUpperCase()] ?? code);

  // Only explicit currency quantities; never shorten IDs, commands or money in yuan.
  return text.replace(
    /((?:灵石|灵晶|道晶|声望|签到币|积分|同心值)\s*[×xX：:]\s*)([+-]?\d+(?:,\d{3})*)(?![\d.万亿])/g,
    (_match, label: string, amount: string) => `${label}${formatNumber(BigInt(amount.replaceAll(',', '')))}`
  );
};

export const CURRENCY_CN_TO_CODE: Record<string, CurrencyCode> = {
  灵石: 'SPIRIT_STONE',
  灵晶: 'SPIRIT_CRYSTAL',
  道晶: 'SPIRIT_MILK',
  声望: 'REPUTATION',
  签到币: 'CHECKIN_COIN',
  积分: 'TOWER_SCORE',
  同心值: 'TONGXIN'
};

/**
 * 根据中文名称获取货币编码
 * 传入空值时返回 `undefined`
 * @param name 中文名称（如 '灵石'）
 * @returns 对应的货币编码；找不到或空值时为 `undefined`
 */
export const fromCurrencyCN = (name?: string): CurrencyCode | undefined => {
  if (!name) {
    return undefined;
  }

  return CURRENCY_CN_TO_CODE[name.trim()];
};
