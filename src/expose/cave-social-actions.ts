import { parseBackendCaveNearby } from '../api/bot/cave-nearby-queries';
import { parseBackendCaveVisit } from '../api/bot/cave-visit-queries';
import { parseBackendCaveLogs } from '../api/bot/cave-queries';
import { parseBackendCaveCommand } from '../api/bot/cave-command';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const empty = object({});
const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const plotIndex = { type: 'integer' as const, minimum: 1, maximum: 2147483647 };

type Target = { ownerUid: number; plotIndex?: number; intentId?: string };
const visit = object(
  {
    ...fields(integer, 'ownerUid cultivatedCount plantedCount matureCount'),
    ...fields(text, 'ownerName relation relationLabel auraText summary stolenStatusText'),
    ...fields(boolean, 'canViewPlots canCollaborate canSteal'),
    recentLogs: list(text),
    plots: list(object({ plotIndex: integer, ...fields(text, 'plotState title detail'), actions: list(object({ label: text, command: text })) }, ['actions']))
  },
  ['cultivatedCount', 'plantedCount', 'matureCount']
);
const result = object({ message: text, ownerUid: integer, snapshotError: text, visit }, ['ownerUid', 'snapshotError', 'visit']);

function visibleVisit(value: ReturnType<typeof parseBackendCaveVisit>) {
  if (value.canViewPlots) {
    return value;
  }
  const { cultivatedCount: _cultivated, plantedCount: _planted, matureCount: _mature, ...visible } = value;

  return visible;
}
function parseSocial(data: unknown, input: Target) {
  const response = parseBackendCaveCommand(data);

  if ((response.ownerUid !== null && response.ownerUid !== input.ownerUid) || (response.visit && response.visit.ownerUid !== input.ownerUid)) {
    throw new Error('灵田操作回执目标不匹配');
  }

  return { ...response, visit: response.visit ? visibleVisit(response.visit) : null };
}
const args = (input: Target, careAction: string | null) => ({
  mode: 'command',
  ownerUid: String(input.ownerUid),
  ownerBid: null,
  plotIndex: input.plotIndex === undefined ? null : String(input.plotIndex),
  careAction
});
const targetSchema = { ownerUid: id, plotIndex };

export const caveSocialActions = {
  get_nearby_caves: observation(
    '查询附近可访问灵田，canSteal 是当前服务端状态，不保证后续操作成功。',
    'cave.nearby',
    empty,
    object(
      {
        message: text,
        players: list(object({ ownerId: integer, ...fields(text, 'ownerName relation relationLabel auraText stolenStatusText'), canSteal: boolean }))
      },
      ['message']
    ),
    () => '/附近灵田',
    data => {
      const response = parseBackendCaveNearby(data);

      if (response.players.some(player => player.ownerId <= 0)) {
        throw new Error('附近灵田目标无效');
      }

      return response;
    }
  ),
  visit_cave: observation<{ ownerUid: number }>(
    '查询指定玩家灵田，返回服务端允许查看的地块与协作、偷药资格；不可见的地块不会返回。',
    'cave.visit',
    object({ ownerUid: id }),
    visit,
    input => `/查看灵田 ${input.ownerUid}`,
    (data, input) => {
      const response = parseBackendCaveVisit(data);

      if (response.ownerUid !== input.ownerUid) {
        throw new Error('访问回执目标不匹配');
      }

      return visibleVisit(response);
    },
    input => ({ target: { uid: input.ownerUid } })
  ),
  execute_task_visit_cave: mutation<{ ownerUid: number; taskInput: string; intentId?: string }>(
    '查询指定玩家灵田，返回服务端允许查看的地块与协作、偷药资格；不可见的地块不会返回。',
    'cave.visit',
    object({ ownerUid: id, taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    visit,
    input => `/查看灵田 ${input.ownerUid}`,
    (data, input) => {
      const response = parseBackendCaveVisit(data);

      if (response.ownerUid !== input.ownerUid) {
        throw new Error('访问回执目标不匹配');
      }

      return visibleVisit(response);
    },
    input => ({ target: { uid: input.ownerUid } }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_cave_logs: observation<{ page?: number }>(
    '分页查询本人灵田互动记录。',
    'cave.logs',
    object({ page }, ['page']),
    object(
      {
        realmName: text,
        canUseCave: boolean,
        lockedMessage: text,
        hasCavePlot: boolean,
        logs: list(text),
        ...fields(integer, 'page total totalPages'),
        nextCursor: text
      },
      ['realmName', 'nextCursor']
    ),
    input => `/灵田记录 ${input.page ?? 1}`,
    parseBackendCaveLogs,
    input => ({ page: String(input.page ?? 1) })
  ),
  collaborate_cave: mutation<Target & { action: 'water' | 'worm' | 'weed' | 'harvest' }>(
    '协作指定玩家灵田：浇灌、除虫、除草或协助收割；目标关系与权限由服务端验证。收割会改变对方灵田。同消息中新操作使用新 intentId，同次重试沿用原编号。',
    'cave.collaborate',
    object({ ...targetSchema, action: { type: 'string', enum: ['water', 'worm', 'weed', 'harvest'] }, intentId: intentIdSchema }, ['plotIndex', 'intentId']),
    result,
    input => `/协作灵田 ${input.ownerUid} ${{ water: '浇灌', worm: '除虫', weed: '除草', harvest: '收割' }[input.action]}${input.plotIndex ? ` ${input.plotIndex}` : ''}`,
    parseSocial,
    input => args(input, input.action),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  ),
  steal_cave_crop: mutation<Target>(
    '对指定玩家灵田执行偷药；可能影响对方收成，关系、次数和目标资格由服务端校验。同消息中新操作使用新 intentId，同次重试沿用原编号。',
    'cave.steal',
    object({ ...targetSchema, intentId: intentIdSchema }, ['plotIndex', 'intentId']),
    result,
    input => `/偷药 ${input.ownerUid}${input.plotIndex ? ` ${input.plotIndex}` : ''}`,
    parseSocial,
    input => args(input, null),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  )
};
