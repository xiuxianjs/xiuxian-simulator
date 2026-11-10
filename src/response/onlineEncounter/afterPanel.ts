import { getBackendConfig } from '@src/api/bot/config';
import { getEventBackendRobotIdentity } from '@src/api/bot/identity';
import { requestRobotBusiness } from '@src/api/bot/robot-business';
import type { GameEvent } from '@src/types/event';
import type { useMessage } from '@src/utils/useMessage';
import { ResultCode } from 'alemonjs';
import { randomUUID } from 'node:crypto';
import { encounterBubble, parseEncounter } from './view';

const panelCommands = {
  profile: /^(我|我的信息|我的资料|我的编号|我的控制台|个人信息|个人资料|个人编号|个人控制台)$/,
  attributes: /^(更新属性|属性面板|我的面板)$/,
  cave: /^(我的洞府|洞府)$/,
  guild: /^(我的宗门|查看势力)$/,
  activity: /^(我的活动|个人活动|活动大厅)$/,
  storyline: /^(查看主线|副本列表|主线列表)$/,
  checkin: /^(签到|一键签到)$/,
  bag: /^(我的)?(储物袋|背包|纳戒)$/,
  realm: /^我的境界$/,
  'storyline-sweep': /^主线扫荡\s+[0-9]+\s*[-－]\s*[0-9]+(?:\s+[0-9]+)?$/,
  'storyline-challenge': /^主线挑战\s+[0-9]+\s*[-－]\s*[0-9]+$/,
  'cave-tend': /^一键打理灵田$/,
  shop: /^商店$/,
  'dungeon-list': /^(查看秘境|秘境列表)$/,
  'dungeon-sweep': /^(扫荡免费秘境|扫荡秘境\s+.+)$/
};

type Panel = keyof typeof panelCommands;
type MessageClient = ReturnType<typeof useMessage>[0];
type Check = { triggered: boolean; pending: ReturnType<typeof parseEncounter>; nextCheckAt: number; nextGameDayAt: number; quotaExhausted: boolean };
const schedules = new Map<string, number>();
const checking = new Set<string>();

function parseCheck(value: unknown): Check {
  const result = value as Record<string, unknown> | null;
  const nextCheckAt = typeof result?.nextCheckAt === 'string' ? Date.parse(result.nextCheckAt) : NaN;
  const nextGameDayAt = typeof result?.nextGameDayAt === 'string' ? Date.parse(result.nextGameDayAt) : NaN;

  if (
    typeof result?.triggered !== 'boolean' ||
    typeof result.quotaExhausted !== 'boolean' ||
    !Number.isFinite(nextCheckAt) ||
    !Number.isFinite(nextGameDayAt)
  ) {
    throw new Error('奇遇排期响应不完整');
  }
  const pending = parseEncounter(result.pending);

  if (result.triggered && !pending) {
    throw new Error('奇遇选项缺失');
  }

  return { triggered: result.triggered, pending, nextCheckAt, nextGameDayAt, quotaExhausted: result.quotaExhausted };
}

function cacheUntil(key: string, at: number) {
  schedules.delete(key);
  schedules.set(key, at);
  if (schedules.size > 10_000) {
    const oldest = schedules.keys().next().value;

    if (oldest !== undefined) {
      schedules.delete(oldest);
    }
  }
}

export async function checkEncounterAfterPanel(e: GameEvent, panel: Panel, message: MessageClient, sent: ReturnType<MessageClient['send']>) {
  const command = (e.MessageText ?? '')
    .trim()
    .replace(/^[!！/#＃]/, '')
    .trimStart();

  await sent
    .then(async receipts => {
      if (!panelCommands[panel].test(command) || !receipts.length || receipts.some(receipt => receipt.code !== ResultCode.Ok)) {
        return;
      }
      const { account } = await getEventBackendRobotIdentity(e);

      if (!account.playerId) {
        return;
      }
      const key = `${getBackendConfig().scope}:${account.playerId}`;

      if (checking.has(key) || (schedules.get(key) ?? 0) > Date.now()) {
        return;
      }
      checking.add(key);
      try {
        // Each check observes the locked schedule. A replay of the original panel
        // message must not retrieve a cached triggered=true delivery response.
        const requestId = randomUUID();
        const result = await requestRobotBusiness(e, 'online-encounter.check', { panel }, parseCheck, { requestId, idempotencyKey: requestId });

        if (!result.success || result.branch !== 'business') {
          cacheUntil(key, Date.now() + 30_000);

          return;
        }
        const { triggered, pending, nextCheckAt, nextGameDayAt, quotaExhausted } = result.data;

        cacheUntil(key, quotaExhausted ? nextCheckAt : Math.min(nextCheckAt, nextGameDayAt));
        if (triggered && pending) {
          await message.send(encounterBubble(e, pending));
        }
      } catch {
        if ((schedules.get(key) ?? 0) <= Date.now()) {
          cacheUntil(key, Date.now() + 30_000);
        }
      } finally {
        checking.delete(key);
      }
    })
    .catch(() => undefined);
}
