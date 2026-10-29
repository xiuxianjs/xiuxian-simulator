import { parseRobotGuildUpgrade } from '../api/bot/guild-upgrade-robot-query';
import type { GuildUpgradeKind } from '../api/bot/guild-upgrade';
import { parseGuildShopPage } from '../api/bot/guild-shop-page';
import { mutation } from './mutation';
import { fields, integer, object, text } from './schema';

const empty = object({});
const upgradeResult = object({
  message: text,
  receipt: object({ ...fields(integer, 'guildId level spiritStoneCost prestigeCost'), ...fields(text, 'guildName kind message') })
});

function upgrade(kind: GuildUpgradeKind, word: string) {
  return mutation(
    `提升当前宗门${word}；直接消耗宗门资源，服务端检查职位、当前等级和实际费用。`,
    `guild.upgrade-${kind}`,
    empty,
    upgradeResult,
    () => `/提升宗门${word}`,
    data => parseRobotGuildUpgrade(data, kind)
  );
}
export const guildBuildingActions = {
  upgrade_guild_level: upgrade('level', '等级'),
  upgrade_guild_vein: upgrade('vein', '灵脉'),
  upgrade_guild_shop: upgrade('shop', '商店'),
  refresh_guild_shop: mutation(
    '手动刷新宗门商店并消耗服务端计算的资源；失败反馈也可能发生在刷新已提交之后，先查询商店及资源，不要自动重复刷新。',
    'guild.shop-refresh',
    empty,
    object({ receipt: object(fields(integer, 'guildId cost remaining itemCount')), pageError: text }, ['pageError']),
    () => '/宗门商店 刷新',
    data => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('宗门商店刷新回执不完整');
      }
      const row = data as Record<string, unknown>;
      const receipt = row.receipt as Record<string, unknown> | undefined;

      if (!receipt || !['guildId', 'cost', 'remaining', 'itemCount'].every(key => Number.isSafeInteger(receipt[key]))) {
        throw new Error('宗门商店刷新回执不完整');
      }
      if (typeof row.pageError === 'string') {
        return { receipt, pageError: row.pageError };
      }
      try {
        parseGuildShopPage(row.page);
      } catch {
        return { receipt, pageError: '刷新已完成，商店页面读取失败，请重新查询' };
      }

      return { receipt };
    }
  )
};
