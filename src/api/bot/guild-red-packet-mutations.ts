import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type CurrencyType = 'spirit_stone' | 'spirits_crystal' | 'contribution';
type PacketCount = 5 | 10 | 15 | 20 | 25 | 30;
type PerAmount = 100 | 1000 | 10000 | 100000;

type SendResult = { packetId: number; currencyType: CurrencyType; packetCount: PacketCount; perAmount: PerAmount; autoClaimedAmount: number; message: string };
type ClaimResult = { packetId: number; currencyType: CurrencyType; amount: number; message: string };
type RecycleResult = { packetId: number; currencyType: CurrencyType; refundAmount: number; message: string };

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}
function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
function currency(value: unknown): value is CurrencyType {
  return value === 'spirit_stone' || value === 'spirits_crystal' || value === 'contribution';
}
export function parseGuildRedPacketSend(value: unknown): SendResult {
  const data = record(value, '发红包响应不完整');

  if (
    !integer(data.packetId) ||
    !currency(data.currencyType) ||
    ![5, 10, 15, 20, 25, 30].includes(data.packetCount as number) ||
    ![100, 1000, 10000, 100000].includes(data.perAmount as number) ||
    !integer(data.autoClaimedAmount) ||
    typeof data.message !== 'string'
  ) {
    throw new Error('发红包响应不完整');
  }

  return data as unknown as SendResult;
}
export function parseGuildRedPacketSettlement(value: unknown, action: string): ClaimResult | RecycleResult {
  const data = record(value, `${action}红包响应不完整`);

  if (!integer(data.packetId) || !currency(data.currencyType) || typeof data.message !== 'string') {
    throw new Error(`${action}红包响应不完整`);
  }
  if (action === '领取') {
    if (!integer(data.amount)) {
      throw new Error('领取红包响应不完整');
    }

    return data as unknown as ClaimResult;
  }
  if (!integer(data.refundAmount)) {
    throw new Error('回收红包响应不完整');
  }

  return data as unknown as RecycleResult;
}

export async function sendBackendGuildRedPacket(
  bid: string | undefined,
  uid: number,
  input: { currencyType: CurrencyType; packetCount: PacketCount; perAmount: PerAmount },
  request?: BackendRequestContext
): Promise<SendResult> {
  if (!bid) {
    throw new Error('发红包缺少平台身份');
  }

  return parseGuildRedPacketSend(await requestBackend(bid, 'post_players_id_guild_red_packets', { path: { id: uid }, body: input, ...writeContext(request) }));
}
export async function claimBackendGuildRedPacket(
  bid: string | undefined,
  uid: number,
  packetId: number,
  request?: BackendRequestContext
): Promise<ClaimResult> {
  if (!bid) {
    throw new Error('领取红包缺少平台身份');
  }

  return parseGuildRedPacketSettlement(
    await requestBackend(bid, 'post_players_id_guild_red_packets_packetId_claim', { path: { id: uid, packetId }, ...writeContext(request) }),
    '领取'
  ) as ClaimResult;
}
export async function recycleBackendGuildRedPacket(
  bid: string | undefined,
  uid: number,
  packetId: number,
  request?: BackendRequestContext
): Promise<RecycleResult> {
  if (!bid) {
    throw new Error('回收红包缺少平台身份');
  }

  return parseGuildRedPacketSettlement(
    await requestBackend(bid, 'post_players_id_guild_red_packets_packetId_recycle', { path: { id: uid, packetId }, ...writeContext(request) }),
    '回收'
  ) as RecycleResult;
}
