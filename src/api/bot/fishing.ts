import { BackendAPIError } from './client';

export const fishingViews = [
  'boss',
  'boss-drops',
  'boss-battle',
  'boss-rewards',
  'contest',
  'contest-species',
  'contest-ranking',
  'contest-rewards',
  'contest-history',
  'sell-range',
  'materials',
  'chum',
  'cast',
  'tools',
  'settings',
  'pending',
  'blessing',
  'overview',
  'start',
  'species',
  'bag-materials',
  'instances',
  'fish',
  'gear',
  'shop',
  'packages',
  'catalog',
  'history',
  'help',
  'operation'
] as const;
export const fishingKinds = ['boss-challenge', 'sell-fish-range', 'sell-material', 'use-chum', 'use-net', 'settings', 'build', 'start-current', 'stop-current', 'start', 'stop', 'sell-fish', 'pond-upgrade', 'rod-upgrade', 'purchase', 'cashout', 'fish-lock', 'blessing-unlock'] as const;
export const fishingCurrencies = ['coin', 'stone', 'crystal', 'dao'] as const;
export const fishingShopCategories = ['all', 'fish', 'bait', 'chum', 'rod', 'net', 'material'] as const;
export const fishingBaits = { 素灵饵: 'plain', 定鳞饵: 'steady', 聚灵饵: 'realm', 引珍饵: 'rare', 唤王饵: 'king' } as const;
export const fishingChums = { 聚鳞散: 'basic', 催鳞散: 'advanced', 引珍散: 'attract', 唤王散: 'king', 引灵散: 'realm', 升灵散: 'deep_realm' } as const;

export type FishingViewKind = (typeof fishingViews)[number];
export type FishingPreviewKind = (typeof fishingKinds)[number];
export type FishingCurrency = (typeof fishingCurrencies)[number];
export type FishingSettingsInput={
  primaryBaitType?:string;
  pushRareFish?:boolean;pushFishKing?:boolean;
  autoChum?:boolean;chumType?:string;chumTier?:number;autoBaitSwitch?:boolean;baitOrder?:string[];
};
export type FishingInput = {
  settings?:FishingSettingsInput;
  view?: FishingViewKind;
  kind?: FishingPreviewKind;
  eventId?: string;
  battleId?: string;
  week?: string;
  speciesId?: string;
  speciesName?: string;
  fishRealm?: number;
  catchId?: string;
  castId?:string;
  sessionId?: string;
  rodId?: string;
  currency?: FishingCurrency;
  sku?: string;
  shopCategory?: (typeof fishingShopCategories)[number];
  shopMode?: 'buy' | 'sell';
  minWeightG?: number;
  maxWeightG?: number;
  operationId?: string;
  page?: number;
  returnPage?: number;
  waterLevel?: number;
  blessingRealm?:number;
  hours?: number;
  baitCount?: number;
  chumCount?: number;
  chumTier?: number;
  baitType?: string;
  chumType?: string;
  quantity?: number;
  preserveUpgrade?: boolean;
  lock?: boolean;
  fishIds?: string[];
};
export type FishingAction = { label: string; command: string };
export type FishingSection = { title: string; id: string; suffix: string; lines: string[]; actions: FishingAction[]; quote?: boolean };
export type FishingView = {
  rulesVersion: string;
  view: string;
  title: string;
  sections: FishingSection[];
  nav?: { page: number; totalPages: number; total: number; command: string };
  footer: FishingAction[];
  navRows?: FishingAction[][];
  emphasisNames?: string[];
  confirmationRef?: string;
  operationId?: string;
  expiresAt?: string;
  status: string;
};

const invalid = (): never => {
  throw new BackendAPIError('垂钓响应不完整，请核对原操作结果。', 'SDK_INVALID_RESPONSE');
};
const row = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid();
  }

  return value as Record<string, unknown>;
};
const text = (value: unknown): string => (typeof value === 'string' ? value : invalid());
const integer = (value: unknown, minimum = 0): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : invalid());
const array = <T>(value: unknown, decode: (value: unknown) => T): T[] => (Array.isArray(value) ? value.map(decode) : invalid());

export function validFishingReference(ref: string, kind: 'y' | 'z' = 'y'): boolean {
  return ref.length <= 64 && /^r1_[1-9a-z][0-9a-z]*_[yz]_[1-9a-z][0-9a-z]*_[0-9a-f]{24}$/.test(ref) && ref.split('_', 3)[2] === kind;
}

export function validFishingEventID(value: string): boolean {
  return /^[A-Za-z0-9_.:-]{1,40}$/.test(value);
}

/** Absolute Shanghai week key; never reinterpret a previous week's claim. */
export function validFishingWeek(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { return false; }
  const date = new Date(value + 'T00:00:00.000Z');

  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 1;
}

function referenceOwner(ref: string): bigint {
  return [...ref.split('_')[1]].reduce((total, character) => total * 36n + BigInt(parseInt(character, 36)), 0n);
}

/** Service commands remain manual. Never truncate an asset ID or confirmation. */
export function validFishingCommand(command: string): boolean {
  return command.startsWith('/') && !/[\r\n\0]/.test(command) && [...command].length <= 80;
}

const action = (value: unknown): FishingAction => {
  const item = row(value);
  const label = text(item.label);
  const command = text(item.command);

  if (!label.trim() || !validFishingCommand(command)) {
    return invalid();
  }

  return { label, command };
};

const absent = (value: unknown) => value === undefined || value === null;

/** One strict DTO for query, original preview and committed receipt. */
export function parseFishingView(value: unknown, uid?: number, referenceKind: 'y' | 'z' = 'y'): FishingView {
  const data = row(value);
  const rulesVersion = text(data.rulesVersion);
  const view = text(data.view);
  const title = text(data.title);

  if (!rulesVersion.trim() || !view.trim() || !title.trim()) {
    return invalid();
  }
  const sections = array(data.sections, value => {
    const section = row(value);
    const actions = absent(section.actions) ? [] : array(section.actions, action);

    if (actions.length > (view === 'blessing' ? 4 : 3)) {
      return invalid();
    }

    return {
      title: absent(section.title) ? '' : text(section.title),
      id: absent(section.id) ? '' : text(section.id),
      suffix: absent(section.suffix) ? '' : text(section.suffix),
      lines: array(section.lines, text),
      actions,
      ...(absent(section.quote) ? {} : { quote: typeof section.quote === 'boolean' ? section.quote : invalid() })
    };
  });

  if (['species', 'bag-materials', 'instances', 'pending'].includes(view) && sections.length > 5) {
    return invalid();
  }
  const footer = absent(data.footer) ? [] : array(data.footer, action);

  if (footer.length > 8) {
    return invalid();
  }
  const result: FishingView = { rulesVersion, view, title, sections, footer, status: absent(data.status) ? '' : text(data.status) };

  if (!absent(data.emphasisNames)) {
    result.emphasisNames = array(data.emphasisNames, text);
  }

  if (!absent(data.navRows)) {
    const rows = array(data.navRows, value => array(value, action));

    const inventoryTabs = view === 'species' || view === 'bag-materials';
    const maxRows = view === 'blessing' || inventoryTabs ? 3 : 2;
    const maxColumns = view === 'blessing' ? 4 : 6;

    if (rows.length > maxRows || rows.some(row => row.length > maxColumns) || (inventoryTabs && rows.flat().length > 12)) { return invalid(); }
    result.navRows = rows;
  }

  if (!absent(data.nav)) {
    const nav = row(data.nav);
    const page = integer(nav.page, 1);
    const totalPages = integer(nav.totalPages, 1);
    const total = integer(nav.total);
    const command = text(nav.command);

    if (page > totalPages || !command.includes('{page}') || !validFishingCommand(command.replace('{page}', String(2147483647)))) {
      return invalid();
    }
    result.nav = { page, totalPages, total, command };
  }
  if (!absent(data.confirmationRef) && data.confirmationRef !== '') {
    const ref = text(data.confirmationRef);

    if (!validFishingReference(ref, referenceKind) || (uid !== undefined && (!Number.isSafeInteger(uid) || uid < 1 || referenceOwner(ref) !== BigInt(uid)))) {
      return invalid();
    }
    result.confirmationRef = ref;
  }
  if (!absent(data.operationId) && data.operationId !== '') {
    result.operationId = text(data.operationId);
  }
  if (!absent(data.expiresAt)) {
    const expiresAt = text(data.expiresAt);

    if (!Number.isFinite(Date.parse(expiresAt))) {
      return invalid();
    }
    result.expiresAt = expiresAt;
  }
  if (result.confirmationRef && (!result.operationId?.trim() || !result.expiresAt || !sections.length)) {
    return invalid();
  }

  return result;
}
