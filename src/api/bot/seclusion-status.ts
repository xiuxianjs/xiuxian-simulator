import { requestBackend } from './client';

type RawRecord = Record<string, unknown>;

export type SeclusionRewardPreview = {
  duration: number;
  dungeonId: number;
  experience: number;
  spiritStone: number;
  huanHunDan: number;
  yangShenDan: number;
  projectedCreditedExperience?: number;
  materialProgressPercent?: number;
  projectedGatheredCount?: number;
  experienceCapWarning?: boolean;
  breakthroughReady?: boolean;
  premium: boolean;
  expectedHuanHunDan?: number;
  expectedYangShenDan?: number;
  soulDew: number;
  rareDrops: Array<{ name: string; quantity: number }>;
};

export type BackendSeclusionStartOption = { duration: number; spiritCost: number; available: boolean; reason?: string; preview: SeclusionRewardPreview };
export type BackendSeclusionDungeon = { id: number; name: string; startOptions: BackendSeclusionStartOption[] };
export type BackendSeclusionRecord = {
  id: number;
  duration: number;
  elapsedHours: number;
  remainingHours: number;
  settleableBlocks: number;
  settleableHours: number;
  isCompleted: boolean;
  dungeonId: number;
  dungeonName?: string;
};
export type BackendSeclusionStatus = {
  recommendedDuration?: number;
  inSeclusion: boolean;
  record?: BackendSeclusionRecord;
  startAvailable: boolean;
  startReason?: string;
  canEnd: boolean;
  endReason?: string;
  earlyExitPolicy: { settleBlockHours: number; refundBeforeHours: number; penaltyBeforeHours: number; penaltyRate: number };
  availableDungeons: BackendSeclusionDungeon[];
};

const asRecord = (value: unknown, message: string): RawRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as RawRecord;
};
const asNumber = (value: unknown, message: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }

  return value;
};
const asBoolean = (value: unknown, message: string) => {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }

  return value;
};
const asString = (value: unknown, message: string) => {
  if (typeof value !== 'string') {
    throw new Error(message);
  }

  return value;
};

const asInteger = (value: unknown, message: string) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(message);
  }

  return value;
};
const optionalString = (value: unknown, message: string) => (value === undefined ? undefined : asString(value, message));

function parsePreview(value: unknown, message: string): SeclusionRewardPreview {
  const row = asRecord(value, message);

  if (!Array.isArray(row.rareDrops)) {
    throw new Error(message);
  }

  return {
    duration: asInteger(row.duration, message),
    dungeonId: asInteger(row.dungeonId, message),
    experience: asInteger(row.experience, message),
    spiritStone: asInteger(row.spiritStone, message),
    huanHunDan: asInteger(row.huanHunDan, message),
    yangShenDan: asInteger(row.yangShenDan, message),
    premium: asBoolean(row.premium, message),
    ...(row.projectedCreditedExperience === undefined ? {} : { projectedCreditedExperience: asInteger(row.projectedCreditedExperience, message) }),
    ...(row.materialProgressPercent === undefined ? {} : { materialProgressPercent: asNumber(row.materialProgressPercent, message) }),
    ...(row.projectedGatheredCount === undefined ? {} : { projectedGatheredCount: asInteger(row.projectedGatheredCount, message) }),
    ...(row.experienceCapWarning === undefined ? {} : { experienceCapWarning: asBoolean(row.experienceCapWarning, message) }),
    ...(row.breakthroughReady === undefined ? {} : { breakthroughReady: asBoolean(row.breakthroughReady, message) }),
    ...(row.expectedHuanHunDan === undefined ? {} : { expectedHuanHunDan: asNumber(row.expectedHuanHunDan, message) }),
    ...(row.expectedYangShenDan === undefined ? {} : { expectedYangShenDan: asNumber(row.expectedYangShenDan, message) }),
    soulDew: asInteger(row.soulDew, message),
    rareDrops: row.rareDrops.map(drop => {
      const item = asRecord(drop, message);

      return { name: asString(item.name, message), quantity: asInteger(item.quantity, message) };
    })
  };
}

export function parseStatus(value: unknown): BackendSeclusionStatus {
  const row = asRecord(value, '探索状态响应不完整');

  if (!Array.isArray(row.availableDungeons)) {
    throw new Error('探索状态响应不完整');
  }
  const availableDungeons = row.availableDungeons.map(parseDungeon);
  const policy = asRecord(row.earlyExitPolicy, '探索状态响应不完整');
  const result: BackendSeclusionStatus = {
    inSeclusion: asBoolean(row.inSeclusion, '探索状态响应不完整'),
    ...(row.recommendedDuration === undefined ? {} : { recommendedDuration: asInteger(row.recommendedDuration, '探索推荐行程响应不完整') }),
    startAvailable: asBoolean(row.startAvailable, '探索状态响应不完整'),
    startReason: optionalString(row.startReason, '探索状态响应不完整'),
    canEnd: asBoolean(row.canEnd, '探索状态响应不完整'),
    endReason: optionalString(row.endReason, '探索状态响应不完整'),
    earlyExitPolicy: {
      settleBlockHours: asInteger(policy.settleBlockHours, '探索状态响应不完整'),
      refundBeforeHours: asInteger(policy.refundBeforeHours, '探索状态响应不完整'),
      penaltyBeforeHours: asInteger(policy.penaltyBeforeHours, '探索状态响应不完整'),
      penaltyRate: asNumber(policy.penaltyRate, '探索状态响应不完整')
    },
    availableDungeons
  };

  if (result.inSeclusion) {
    const record = asRecord(row.record, '探索记录响应不完整');

    result.record = {
      id: asInteger(record.id, '探索记录响应不完整'),
      duration: asInteger(record.duration, '探索记录响应不完整'),
      dungeonId: asInteger(record.dungeonId, '探索记录响应不完整'),
      elapsedHours: asInteger(row.elapsedHours, '探索记录响应不完整'),
      remainingHours: asInteger(row.remainingHours, '探索记录响应不完整'),
      settleableBlocks: asInteger(row.settleableBlocks, '探索记录响应不完整'),
      settleableHours: asInteger(row.settleableHours, '探索记录响应不完整'),
      isCompleted: asBoolean(row.isCompleted, '探索记录响应不完整'),
      dungeonName: optionalString(row.dungeonName, '探索记录响应不完整')
    };
  }

  return result;
}

export function parseDungeon(value: unknown, index: number): BackendSeclusionDungeon {
  const dungeon = asRecord(value, `探索秘境响应不完整（${index}）`);

  if (!Array.isArray(dungeon.startOptions)) {
    throw new Error(`探索秘境响应不完整（${index}）`);
  }

  return {
    id: asInteger(dungeon.id, `探索秘境响应不完整（${index}）`),
    name: asString(dungeon.name, `探索秘境响应不完整（${index}）`),
    startOptions: dungeon.startOptions.map((value, optionIndex) => {
      const option = asRecord(value, `探索时长响应不完整（${index}:${optionIndex}）`);

      return {
        duration: asInteger(option.duration, '探索时长响应不完整'),
        spiritCost: asInteger(option.spiritCost, '探索时长响应不完整'),
        available: asBoolean(option.available, '探索时长响应不完整'),
        reason: optionalString(option.reason, '探索时长响应不完整'),
        preview: parsePreview(option.preview, '探索收益预览响应不完整')
      };
    })
  };
}

export type BackendSeclusionSelection =
  | { code: 'OK'; status: BackendSeclusionStatus; dungeon: BackendSeclusionDungeon }
  | { code: 'IN_SECLUSION'; status: BackendSeclusionStatus }
  | { code: 'DUNGEON_NOT_FOUND'; message: string };

export async function getBackendSeclusionSelection(bid: string | undefined, uid: number, dungeonName: string): Promise<BackendSeclusionSelection> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  await requestBackend(bid, 'post_players_id_seclusion_active_marker_repair', { path: { id: uid } });
  const row = asRecord(await requestBackend(bid, 'get_players_id_seclusion_selection', { path: { id: uid }, query: { dungeonName } }), '探索选择响应不完整');

  if (row.code === 'IN_SECLUSION') {
    return { code: 'IN_SECLUSION', status: parseStatus(row.status) };
  }
  if (row.code === 'DUNGEON_NOT_FOUND') {
    return { code: 'DUNGEON_NOT_FOUND', message: asString(row.message, '探索选择响应不完整') };
  }
  if (row.code === 'OK') {
    return { code: 'OK', status: parseStatus(row.status), dungeon: parseDungeon(row.dungeon, 0) };
  }
  throw new Error('探索选择响应不完整');
}

export async function guardBackendSeclusionCommand(bid: string | undefined, uid: number, command: string): Promise<{ inSeclusion: boolean; allowed: boolean }> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_seclusion_guard', { path: { id: uid }, body: { command } });

  if (!data || typeof data.inSeclusion !== 'boolean' || typeof data.allowed !== 'boolean') {
    throw new Error('探索指令准入接口返回不完整，请更新服务端后重试');
  }

  return data;
}

export async function getBackendSeclusionDisplay(bid: string | undefined, uid: number): Promise<BackendSeclusionStatus> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }
  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('探索状态查询参数无效');
  }
  await requestBackend(bid, 'post_players_id_seclusion_active_marker_repair', { path: { id: uid } });

  return parseStatus(await requestBackend(bid, 'get_players_id_seclusion', { path: { id: uid } }));
}
