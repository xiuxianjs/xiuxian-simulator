import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type GuildShopExchangeData = {
  itemId: number;
  itemName: string;
  quantity: number;
  contributionDelta: number;
  prestigeGain: number;
  remainingDailyCount: number;
};

export function parseGuildShopExchange(value: unknown): GuildShopExchangeData {
  const row = value as Partial<GuildShopExchangeData> | null;

  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    !Number.isSafeInteger(row.itemId) ||
    typeof row.itemName !== 'string' ||
    !Number.isSafeInteger(row.quantity) ||
    !Number.isSafeInteger(row.contributionDelta) ||
    !Number.isSafeInteger(row.prestigeGain) ||
    !Number.isSafeInteger(row.remainingDailyCount)
  ) {
    throw new Error('宗门商店兑换响应不完整');
  }

  return row as GuildShopExchangeData;
}

/** 根据当前商店展示序号由服务端原子选取并兑换栏位。 */
export async function exchangeBackendGuildShopByIndex(
  bid: string | undefined,
  uid: number,
  itemIndex: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<GuildShopExchangeData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseGuildShopExchange(
    await requestBackend(bid, 'post_players_id_guild_shop_exchange', {
      path: { id: uid },
      ...writeContext(request),
      headers: repeatPresentationHeaders(repeatCommand),
      body: { itemIndex }
    })
  );
}
