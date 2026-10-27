import { parseGuildDailyTask } from '../api/bot/guild-daily-task-query';
import { parseGuildWeeklyTask } from '../api/bot/guild-weekly-task-query';
import { parseRobotGuildMilestoneClaim } from '../api/bot/guild-claims-robot-query';
import { parseGuildMilestoneClaim, parseGuildMilestonesClaimAll } from '../api/bot/guild-milestone-claim';
import { parseRobotGuildWorship } from '../api/bot/guild-activity-robot-query';
import { parseGuildShopPage } from '../api/bot/guild-shop-page';
import { parseRobotGuildShopExchange } from '../api/bot/guild-shop-robot-query';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

type Period = 'daily_activity' | 'weekly_activity';
type Offer = '灵石' | '灵晶' | '道晶';
type ExpectedItem = { shopItemId: number; itemId: number; name: string; category: string; quantity: number; priceContribution: number };
const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const nonnegative = { type: 'integer' as const, minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const period = { type: 'string' as const, enum: ['daily_activity', 'weekly_activity'] };
const offer = { type: 'string' as const, enum: ['灵石', '灵晶', '道晶'] };
const label = (type: Period) => (type === 'daily_activity' ? '日活' : '周活');
const milestone = object(
  { ...fields(integer, 'id threshold rewardSpiritStone rewardContribution rewardPrestige'), description: text, ...fields(boolean, 'claimed canClaim') },
  ['description', 'rewardSpiritStone', 'rewardContribution', 'rewardPrestige']
);
const expectedItem = object({ shopItemId: positive, itemId: positive, name: text, category: text, quantity: positive, priceContribution: nonnegative });

export const guildRoutineActions = {
  get_guild_daily: observation(
    '查询本人宗门日常任务、活跃、贡献和可领取里程碑；沿用服务端周期重置与结算，不自动完成任务。',
    'guild.daily',
    object({}),
    object({
      ...fields(integer, 'guildId contributionPoints dailyActivity dailyActivityMax dailyMiningCount dailyExchangeCount prestigeRemaining'),
      ...fields(text, 'guildName miningText'),
      ...fields(boolean, 'checkinDone dailyWorshipDone dailyStorylineDone claimAllAvailable'),
      dailyTasks: list(object({ ...fields(text, 'key line actionLabel'), actionAvailable: boolean })),
      milestones: list(milestone)
    }),
    () => '/宗门日常',
    value => {
      const result = parseGuildDailyTask(value);
      const raw = (value as { milestones: Record<string, unknown>[] }).milestones;

      return { ...result, milestones: result.milestones.map((item, index) => ({ ...raw[index], ...item })) };
    }
  ),
  get_guild_weekly: observation(
    '查询本人宗门周常任务、活跃、贡献、可领里程碑及预计俸禄；预计俸禄不是领取回执。',
    'guild.weekly',
    object({}),
    object({
      ...fields(
        integer,
        'guildId contributionPoints weeklyActivity weeklyActivityMax stipendThreshold stipendPreviewAmount stipendBaseAmount stipendGuildLevel weeklyCheckinCount weeklyMiningCount weeklyExchangeCount'
      ),
      ...fields(number, 'stipendLevelMultiplier stipendActivityMultiplier'),
      guildName: text,
      claimAllAvailable: boolean,
      weeklyTasks: list(object({ ...fields(text, 'key label unit bonusText'), ...fields(integer, 'progress target activityReward'), completed: boolean })),
      milestones: list(milestone)
    }),
    () => '/宗门周常',
    parseGuildWeeklyTask
  ),
  claim_guild_milestone: mutation<{ type: Period; milestoneId: number }>(
    '领取宗门日活或周活面板中的指定奖励；服务端在发奖前核对原类型，仍校验本人活跃和已领状态。奖励中的宗门灵石/声望归宗门，贡献归成员，不应当作个人灵石收益。',
    'guild.milestone-claim',
    object({ type: period, milestoneId: positive }),
    object({
      message: text,
      receipt: object({
        message: text,
        milestoneId: integer,
        type: period,
        ...fields(integer, 'threshold currentPoints'),
        rewards: object(fields(integer, 'spiritStone contribution prestige'))
      })
    }),
    input => `/领取宗门${label(input.type)}奖励 ${input.milestoneId}`,
    (data, input) => {
      const parsed = parseRobotGuildMilestoneClaim(data, input.milestoneId);
      const receipt = parseGuildMilestoneClaim((data as Record<string, unknown>).receipt, input.milestoneId);

      if (receipt.type !== input.type) {
        throw new Error('宗门奖励回执类型不匹配');
      }

      return { message: parsed.message, receipt };
    },
    input => ({ milestoneArg: String(input.milestoneId), expectedType: input.type })
  ),
  claim_all_guild_milestones: mutation<{ type: Period }>(
    '一键领取本人可领宗门日活或周活奖励；必须检查 partial、claimed 和 message，部分成功不代表全部已领取。',
    'guild.milestone-claim-all',
    object({ type: period }),
    object({ message: text, partial: boolean, claimed: list(object({ ...fields(integer, 'id threshold'), description: text })) }),
    input => `/一键领取宗门${label(input.type)}奖励`,
    parseGuildMilestonesClaimAll
  ),
  get_guild_worship_options: mutation(
    '查看今日祭祀状态及三种供品的服务端消耗、活跃和贡献回报，不执行祭祀。',
    'guild.worship',
    object({}),
    object({
      ...fields(boolean, 'dailyWorshipDone canWorship'),
      ...fields(text, 'introText noticeText'),
      offers: list(object({ name: offer, ...fields(integer, 'cost activity contribution'), line: text, canWorship: boolean }))
    }),
    () => '/祭祀祖师',
    data => {
      const result = parseRobotGuildWorship(data);

      if (result.code !== 'GUIDE') {
        throw new Error('祭祀选项响应不完整');
      }

      return result.data;
    },
    () => ({ offer: '' })
  ),
  worship_guild: mutation<{ offer: Offer }>(
    '使用指定灵石、灵晶或道晶供品执行一次祭祀祖师，会消耗货币；先查看供品选项，不会自动换用其他货币。',
    'guild.worship',
    object({ offer }),
    object({
      ...fields(integer, 'guildId cost dailyActivityAdded currentDailyActivity contributionAdded'),
      offer,
      ...fields(text, 'message offerText dailyActivityText contributionText')
    }),
    input => `/祭祀祖师 ${input.offer}`,
    (data, input) => {
      const result = parseRobotGuildWorship(data);

      if (result.code !== 'OK' || result.data.offer !== input.offer) {
        throw new Error('祭祀结果与请求不匹配');
      }

      return result.data;
    }
  ),
  get_guild_shop: mutation(
    '查看本人宗门商店、贡献、已兑换/锁定状态和原商品快照；不手动刷新或兑换，返回当前自动刷新配置。兑换须携带本次商品的原 id、itemId、名称、类别、数量及贡献价格。',
    'guild.shop',
    object({}),
    object({
      contributionPoints: integer,
      ...fields(boolean, 'autoRefreshEnabled isLeader'),
      autoRefreshHours: list(number),
      autoRefreshStatusText: text,
      refreshDailyLimit: integer,
      items: list(
        object(
          {
            ...fields(integer, 'id index itemId quantity priceContribution'),
            ...fields(text, 'name category statusText slotName itemType itemSubtype'),
            ...fields(boolean, 'purchased canExchange locked')
          },
          ['slotName', 'locked', 'itemType', 'itemSubtype']
        )
      )
    }),
    () => '/宗门商店',
    parseGuildShopPage
  ),
  exchange_guild_shop_item: mutation<{ itemIndex: number; expected: ExpectedItem }>(
    '兑换宗门商店本次列表中的一个商品；expected.shopItemId 取列表 id，其余字段使用该商品原值。服务端在事务内校验原商品及贡献价格，刷新、替换或价格变化时拒绝，不自动兑换同序号的新商品。' +
      'receipt.itemId 是商店栏位记录编号，contributionDelta 是含服务端兑换奖励的净贡献变化。',
    'guild.shop-exchange',
    object({ itemIndex: { type: 'integer', minimum: 1, maximum: 2147483647 }, expected: expectedItem }),
    object({
      outcome: { type: 'string', enum: ['result'] },
      receipt: object({ ...fields(integer, 'itemId quantity contributionDelta prestigeGain remainingDailyCount'), itemName: text })
    }),
    input => `/宗门商店兑换 ${input.itemIndex}`,
    (data, input) => {
      const result = parseRobotGuildShopExchange(data);

      if (
        result.outcome !== 'result' ||
        result.receipt.itemId !== input.expected.shopItemId ||
        result.receipt.itemName !== input.expected.name ||
        result.receipt.quantity !== input.expected.quantity
      ) {
        throw new Error('宗门兑换回执与原商品不匹配');
      }

      return result;
    },
    input => ({
      itemIndex: input.itemIndex,
      expected: {
        shopItemId: input.expected.shopItemId,
        itemId: input.expected.itemId,
        name: input.expected.name,
        category: input.expected.category,
        quantity: input.expected.quantity,
        priceContribution: input.expected.priceContribution
      }
    })
  )
};
