import { ExposeError } from 'alemonjs';
import { parsePublicTribulationEvent, parsePublicTribulationList } from '../api/schemas/public-tribulation';
import { observation } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const event = object(
  {
    ...fields(integer, 'eventId playerId targetStage requiredAttempts'),
    ...fields(text, 'name currentRealm targetRealm tribulationName status opensAt deadline strikeAt'),
    ...fields(boolean, 'participationOpen interactionOpen disruptionKarmaEnabled canStart'),
    disruption: object(fields(integer, 'count attackBonusPercent'))
  },
  ['deadline', 'strikeAt', 'participationOpen', 'disruptionKarmaEnabled', 'disruption']
);

export const publicTribulationActions = {
  get_public_tribulations: observation<{ page?: number; playerId?: number; name?: string }>(
    '分页查询公开劫云榜，可按目标玩家 UID 或道号搜索；不参与、不捣乱，也不开始渡劫。资格与状态以最新服务端结果为准。',
    'tribulation.public',
    object({ page: { type: 'integer', minimum: 1, maximum: 429496729 }, playerId: id, name: { type: 'string', minLength: 1, maxLength: 100 } }, [
      'page',
      'playerId',
      'name'
    ]),
    object({ page: integer, hasMore: boolean, items: list(event) }),
    input => `/劫云榜 ${input.page ?? 1}${input.playerId ? ` UID ${input.playerId}` : input.name ? ` 道号 ${input.name}` : ''}`,
    (data, input) => {
      const rows = parsePublicTribulationList(data);

      return { page: input.page ?? 1, hasMore: rows.length > 5, items: rows.slice(0, 5) };
    },
    input => ({
      kind: 'list',
      offset: ((input.page ?? 1) - 1) * 5,
      limit: 6,
      ...(input.playerId ? { playerId: input.playerId } : {}),
      ...(input.name ? { name: input.name } : {})
    }),
    input => {
      if (
        (input.playerId !== undefined && input.name !== undefined) ||
        (input.name !== undefined && (input.name !== input.name.trim() || /[\r\n]/.test(input.name)))
      ) {
        throw new ExposeError('INVALID_INPUT', '请选择 UID 或单行道号中的一种搜索条件');
      }
    }
  ),
  get_public_tribulation: observation<{ eventId: number }>(
    '读取指定公开渡劫事件及互动开放状态；仅观望详情，不领取参与奖励、不捣乱、不开始渡劫。',
    'tribulation.public',
    object({ eventId: id }),
    event,
    input => `/观望渡劫 ${input.eventId}`,
    (data, input) => {
      const result = parsePublicTribulationEvent(data);

      if (result.eventId !== input.eventId) {
        throw new Error('公开渡劫回执事件编号不匹配');
      }

      return result;
    },
    input => ({ kind: 'observe', eventId: input.eventId })
  )
};
