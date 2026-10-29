import { ExposeError } from 'alemonjs';
import { parseBlackBoxBidPreview, parseBlackBoxHistory, parseBlackBoxOverview, parseBlackBoxReservation, parseBlackBoxRoom } from '../api/schemas/black-box';
import type { GameEvent } from '../types/event';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const empty = object({});
const target = {
  eventId: { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  roomId: { type: 'string' as const, minLength: 1, maxLength: 64 }
};
const amount = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

type Target = { eventId: number; roomId: string };
type Bid = Target & { amount: number };
const roomSchema = object({
  ...fields(text, 'roomId status phase currency serverTime opensAt detailsJson'),
  ...fields(integer, 'floor ownBid ownHeld available')
});
const reservationSchema = object(
  { ...fields(text, 'serverTime roomId sessionId opensAt status joinClosesAt groupStartsAt'), ...fields(boolean, 'confirmed notificationEnabled') },
  ['joinClosesAt', 'groupStartsAt', 'notificationEnabled']
);

function privateArguments<I extends Record<string, unknown>>(input: I, event: GameEvent): Record<string, unknown> {
  if (event.name !== 'private.message.create' || event.isPrivate === false || event.IsPrivate === false) {
    throw new ExposeError('FORBIDDEN', '黑盒拍卖仅支持私聊');
  }

  return input;
}
function roomResult(result: ReturnType<typeof parseBlackBoxRoom>, input: Target) {
  if (result.roomId !== input.roomId) {
    throw new Error('黑盒房间回执不匹配');
  }

  return { ...result, detailsJson: JSON.stringify(result) };
}
function room(data: unknown, input: Target) {
  return roomResult(parseBlackBoxRoom(data), input);
}
const reference = (input: Target) => `${input.eventId} ${input.roomId}`;

export const blackBoxActions = {
  get_black_box_overview: observation(
    '私聊查询黑盒活动、排期、可用资金和额度；详情来自服务端公开信息。',
    'black-box.overview',
    empty,
    object({
      enabled: boolean,
      serverTime: text,
      ...fields(integer, 'allowanceAvailable allowanceHeld allowanceSpent'),
      supplementGranted: boolean,
      detailsJson: text
    }),
    () => '/黑盒拍卖',
    data => {
      const result = parseBlackBoxOverview(data);

      return { ...result, detailsJson: JSON.stringify(result) };
    },
    privateArguments
  ),
  get_black_box_history: observation<{ page?: number }>(
    '私聊分页查询本人黑盒预约与竞拍记录。',
    'black-box.history',
    object({ page }, ['page']),
    object({
      serverTime: text,
      page: integer,
      hasMore: boolean,
      items: list(
        object({
          ...fields(integer, 'eventId activityDay ownBid ownHeld charged'),
          ...fields(text, 'title roomId opensAt status currency'),
          confirmed: boolean,
          detailsJson: text
        })
      )
    }),
    input => `/黑盒记录 ${input.page ?? 1}`,
    data => {
      const result = parseBlackBoxHistory(data);

      return { ...result, items: result.items.map(item => ({ ...item, detailsJson: JSON.stringify(item) })) };
    },
    (input, event) => privateArguments({ page: input.page ?? 1 }, event)
  ),
  get_black_box_room: observation<Target>(
    '私聊查询本人已入场房间的阶段、鉴宝线索、报价与结算；未揭晓内容不会提前返回。',
    'black-box.room',
    object(target),
    roomSchema,
    input => `/黑盒详情 ${reference(input)}`,
    room,
    privateArguments
  ),
  manage_black_box_reservation: mutation<Target & { action: 'reserve' | 'confirm' | 'cancel' | 'join' | 'subscribe' | 'unsubscribe' }>(
    '私聊管理黑盒入场：join 入场、reserve 预约、confirm 确认参拍、cancel 取消、subscribe 开启提醒、unsubscribe 关闭提醒；可用操作取决于服务端阶段。',
    'black-box.reservation',
    object({ ...target, action: { type: 'string', enum: ['reserve', 'confirm', 'cancel', 'join', 'subscribe', 'unsubscribe'] } }),
    reservationSchema,
    input => `${{ reserve: '/黑盒预约', confirm: '/黑盒确认', cancel: '/黑盒取消', join: '/黑盒入场', subscribe: '/黑盒提醒', unsubscribe: '/黑盒提醒' }[input.action]} ${reference(input)}${input.action === 'unsubscribe' ? ' 关闭' : ''}`,
    (data, input) => {
      const result = parseBlackBoxReservation(data);

      if (result.roomId !== input.roomId) {
        throw new Error('黑盒预约回执不匹配');
      }

      return result;
    },
    privateArguments
  ),
  reveal_black_box_clue: mutation<Target & { direction: string }>(
    '私聊查验指定鉴宝方向；次数和结果由服务端决定。',
    'black-box.probe',
    object({ ...target, direction: { type: 'string', minLength: 1, maxLength: 64 } }),
    roomSchema,
    input => `/黑盒鉴宝 ${reference(input)} ${input.direction}`,
    room,
    privateArguments
  ),
  reveal_all_black_box_clues: mutation<Target>(
    '私聊查齐房间鉴宝线索；次数和资格由服务端校验。',
    'black-box.probe',
    object(target),
    roomSchema,
    input => `/黑盒鉴宝 ${reference(input)} 全部`,
    room,
    (input, event) => privateArguments({ ...input, all: true }, event)
  ),
  preview_black_box_bid: observation<Bid>(
    '私聊预览指定金额报价，不提交；确认时服务端重新检查阶段和余额，预览不锁定资金。',
    'black-box.bid-preview',
    object({ ...target, amount }),
    object({ amount: integer, room: roomSchema }),
    input => `/黑盒出价 ${reference(input)} ${input.amount}`,
    (data, input) => {
      const result = parseBlackBoxBidPreview(data);

      if (result.amount !== input.amount) {
        throw new Error('黑盒报价预览金额不匹配');
      }

      return { amount: result.amount, room: roomResult(result.room, input) };
    },
    privateArguments
  ),
  submit_black_box_bid: mutation<Bid>(
    '私聊确认提交指定金额报价；先核对预览，服务端重新校验阶段与余额。同一原消息重试保持幂等。',
    'black-box.bid',
    object({ ...target, amount }),
    roomSchema,
    input => `/确认黑盒出价 ${reference(input)} ${input.amount}`,
    room,
    privateArguments
  ),
  withdraw_black_box_bid: mutation<Target>(
    '私聊撤回本人报价；服务端返回实际剩余占用与余额。',
    'black-box.bid',
    object(target),
    roomSchema,
    input => `/黑盒撤标 ${reference(input)}`,
    room,
    (input, event) => privateArguments({ ...input, amount: 0 }, event)
  )
};
