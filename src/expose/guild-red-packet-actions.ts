import { ExposeError } from 'alemonjs';
import { parseGuildRedPackets } from '../api/bot/guild-red-packets-queries';
import { parseGuildMyRedPackets } from '../api/bot/guild-my-red-packets-queries';
import { parseGuildRedPacketSettlement } from '../api/bot/guild-red-packet-mutations';
import { parseRobotGuildRedPacketSend } from '../api/bot/guild-red-packet-send-robot-query';
import { intentIdSchema, mutation, observation, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const empty = object({});
const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const packet = object(
  { ...fields(integer, 'id perAmount packetCount claimedCount remaining'), ...fields(text, 'currencyType currencyName remainingTimeText expiresAt') },
  ['expiresAt']
);
const ownPacket = object(
  {
    ...fields(integer, 'id perAmount packetCount claimedCount status recycled recycleAmount'),
    ...fields(text, 'currencyType currencyName statusText expiresAt'),
    canRecycle: boolean
  },
  ['expiresAt']
);

type Send = { currency: 'spirit_stone' | 'spirits_crystal' | 'contribution'; count: number; amount: number; intentId?: string };
const names = { spirit_stone: '灵石', spirits_crystal: '灵晶', contribution: '贡献点' } as const;
const settlement = (action: '领取' | '回收') => (data: unknown, input: { packetId: number }) => {
  const result = parseGuildRedPacketSettlement(data, action);

  if (result.packetId !== input.packetId) {
    throw new Error('宗门红包回执编号不匹配');
  }

  return result;
};

export const guildRedPacketActions = {
  get_guild_red_packets: observation(
    '查询当前宗门可领取红包、剩余份数和有效期；以服务端领取校验为准。',
    'guild.red-packets',
    empty,
    object({ hasGuild: boolean, guildName: text, packets: list(packet) }, ['guildName']),
    () => '/宗门红包',
    parseGuildRedPackets
  ),
  get_sent_guild_red_packets: observation(
    '查询本人发送的宗门红包、领取进度和可回收金额。',
    'guild.my-red-packets',
    empty,
    object({ hasGuild: boolean, guildName: text, packets: list(ownPacket) }, ['guildName']),
    () => '/我发的红包',
    parseGuildMyRedPackets
  ),
  claim_guild_red_packet: mutation<{ packetId: number }>(
    '领取指定宗门红包；服务端检查宗门、剩余份数和领取状态，返回实际金额。',
    'guild.red-packet-claim',
    object({ packetId: id }),
    object({ packetId: integer, currencyType: text, amount: integer, message: text }),
    input => `/领红包 ${input.packetId}`,
    settlement('领取'),
    input => input
  ),
  recycle_guild_red_packet: mutation<{ packetId: number }>(
    '回收本人符合条件的红包余额；服务端校验所有权与有效期，返回实际退回金额。',
    'guild.red-packet-recycle',
    object({ packetId: id }),
    object({ packetId: integer, currencyType: text, refundAmount: integer, message: text }),
    input => `/回收红包 ${input.packetId}`,
    settlement('回收'),
    input => input
  ),
  send_guild_red_packet: mutation<Send>(
    '发送宗门红包，会扣除红包道具及份数乘每份金额；发送者自动领取一份，以服务端实际回执为准。同消息新红包使用新 intentId，同次重试沿用原编号。',
    'guild.red-packet-send',
    object(
      {
        currency: { type: 'string', enum: ['spirit_stone', 'spirits_crystal', 'contribution'] },
        count: { type: 'integer', minimum: 5, maximum: 30 },
        amount: { type: 'integer', minimum: 100, maximum: 100000 },
        intentId: intentIdSchema
      },
      ['intentId']
    ),
    object({
      outcome: text,
      receipt: object({ ...fields(integer, 'packetId packetCount perAmount autoClaimedAmount'), ...fields(text, 'currencyType message') })
    }),
    input => `/发红包 ${names[input.currency]} ${input.count} ${input.amount}`,
    (data, input) => {
      const result = parseRobotGuildRedPacketSend(data);

      if (
        result.outcome !== 'result' ||
        result.receipt.currencyType !== input.currency ||
        result.receipt.packetCount !== input.count ||
        result.receipt.perAmount !== input.amount
      ) {
        throw new Error('宗门红包发送回执不匹配');
      }

      return result;
    },
    input => ({
      currency: names[input.currency],
      count: { text: String(input.count), value: input.count },
      amount: { text: String(input.amount), value: input.amount }
    }),
    input => {
      validateIntentId(input.intentId);
      if (![5, 10, 15, 20, 25, 30].includes(input.count) || ![100, 1000, 10000, 100000].includes(input.amount)) {
        throw new ExposeError('INVALID_INPUT', '红包份数或每份金额不在服务端支持范围内');
      }
    },
    { intentId: input => input.intentId }
  )
};
