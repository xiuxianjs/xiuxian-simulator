import { onResponse } from 'alemonjs';
import { requestBackend, writeContext } from '@src/api/bot/client';
import { createBackendRequestContext } from '@src/api/bot/context';
import { getEventBackendRobotIdentity } from '@src/api/bot/identity';
import { selects } from '@src/response/config';
import { buildBubble, confirmBubble, errorBubble, listBubble, resultBubble, type BubbleAction } from '@src/response/presentation';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';

const currencyNames = { JADE: '仙玉', SPIRIT_MILK: '道晶', SPIRIT_CRYSTAL: '灵晶' } as const;

type Currency = keyof typeof currencyNames;
type Reward = { name: string; amount: number };
type Product = { id: string; currency: Currency; price: number; limit: number; reward: { name: string; quantity: number } };
type Sign = { crystals: number; jade: number };
type SignResult = { signs: Array<Sign | null>; boxPool?: unknown[]; boxResult?: unknown[] };
type Overview = {
  month: string;
  day: number;
  startsAt: string;
  endsAt: string;
  jade: number;
  makeupPrice?: number;
  task?: { name: string; action: string; tiers: Array<{ count: number; jade: number }> };
  products?: Product[];
  unopened: string[];
  progress: {
    signs: Array<Sign | null>;
    taskCounts: number[];
    taskJade: number[];
    bought: Record<string, number>;
  };
};
type Quote = {
  ref: string;
  day?: number;
  currency: Currency;
  price: number;
  checkin?: Sign;
  reward?: Product['reward'];
  expiresAt: string;
};

const back = { label: '返回活动', command: '/半月活动' };
const shop = { label: '活动商店', command: '/半月活动 商店' };
const shortReference = /^r1_[0-9a-z]{1,13}_hm_[0-9a-z]{1,13}_[0-9a-f]{24}$/;
const monthPattern = /^\d{4}-\d{2}$/;
const taskCommands: Record<string, string> = {
  storyline_clear: '/查看主线',
  forge_craft: '/我的锻造',
  dungeon_clear: '/秘境列表',
  alchemy: '/丹方',
  tongtian_clear: '/通天塔',
  fishing_catch: '/垂钓',
  farm_work: '/我的灵田'
};

function signRewards(sign: Sign): string[] {
  return [`灵晶 ×${sign.crystals}`, `仙玉 ×${sign.jade}`];
}

export default onResponse(selects, async event => {
  const [message] = useMessage();
  const send = async (payload: Parameters<typeof message.send>[0]) => {
    await message.send(payload);
  };
  const bid = event.UserId;
  const base = { bid, isPrivate: event.isPrivate ?? false };
  const [, mode, value, extra] = event.MessageText.trim()
    .replace(/^[!！/#＃]/, '')
    .split(/\s+/);
  const request = createBackendRequestContext(event);
  const signReceipt = (result: SignResult, day: number, makeup: boolean) => {
    const sign = result.signs[day - 1];

    return resultBubble({
      ...base,
      title: makeup ? '半月活动补签' : '半月活动签到',
      status: 'done',
      lines: [`结果：第 ${day} 天已${makeup ? '补签' : '签到'}`, ...(result.boxPool?.length && !result.boxResult?.length ? ['宝箱：半月随机礼盒可开启'] : [])],
      rewards: sign ? signRewards(sign) : [],
      footer: [back, shop]
    });
  };

  try {
    if (mode === '确认' && (!value || !shortReference.test(value) || extra)) {
      return await send(errorBubble({ ...base, title: '半月活动', reason: '说明：确认编号无效，请重新预览', footer: [back] }));
    }
    const { account } = await getEventBackendRobotIdentity(event, request);

    if (account.status !== 'registered' || !account.playerId) {
      throw new Error('半月活动缺少角色身份');
    }
    const path = { id: account.playerId };

    if (mode === '确认') {
      const result = (await requestBackend(bid, 'post_players_id_half_month_activity_confirm', {
        path,
        body: { ref: value },
        ...writeContext(request)
      })) as { day?: number; sign?: SignResult; purchase?: { issued: Reward[] } };

      if (result.sign && result.day) {
        return await send(signReceipt(result.sign, result.day, true));
      }
      if (!result.purchase) {
        throw new Error('半月活动回执无效');
      }

      return await send(
        resultBubble({
          ...base,
          title: '半月活动兑换',
          status: 'done',
          lines: ['结果：兑换成功'],
          rewards: result.purchase.issued.map(reward => `${reward.name} ×${reward.amount}`),
          footer: [back, shop]
        })
      );
    }

    if (mode === '开礼盒' && value && monthPattern.test(value)) {
      const rewards = (await requestBackend(bid, 'post_players_id_half_month_activity_open_box', {
        path,
        body: { month: value },
        ...writeContext(request)
      })) as Reward[];

      return await send(
        resultBubble({
          ...base,
          title: '半月随机礼盒',
          status: 'done',
          lines: ['结果：礼盒已开启'],
          rewards: rewards.map(reward => `${reward.name} ×${reward.amount}`),
          footer: [back]
        })
      );
    }

    if (mode === '签到') {
      const day = Number(value);

      if (!extra || !monthPattern.test(extra) || !Number.isInteger(day) || day < 1 || day > 7) {
        return await send(errorBubble({ ...base, title: '半月活动', reason: '说明：请在活动中选择签到日期', footer: [back] }));
      }
      const result = (await requestBackend(bid, 'post_players_id_half_month_activity_sign', {
        path,
        body: { month: extra, day, makeup: false },
        ...writeContext(request)
      })) as SignResult;

      return await send(signReceipt(result, day, false));
    }

    const overview = (await requestBackend(bid, 'get_players_id_half_month_activity', {
      path,
      ...(mode === '记录' && value && monthPattern.test(value) ? { query: { month: value } } : {})
    })) as Overview;

    if (mode === '补签' || mode === '兑换') {
      const number = Number(value);
      const product = overview.products?.[number - 1];
      const makeup = mode === '补签';

      if (!Number.isInteger(number) || number < 1 || (makeup ? number >= overview.day : !product)) {
        return await send(errorBubble({ ...base, title: '半月活动', reason: '说明：请在活动中选择漏签日或商品', footer: [back, shop] }));
      }
      const quote = (await requestBackend(bid, 'post_players_id_half_month_activity_preview', {
        path,
        body: { month: overview.month, ...(makeup ? { day: number } : { productId: product?.id }) },
        ...writeContext(request)
      })) as Quote;

      if (!shortReference.test(quote.ref)) {
        throw new Error('半月活动确认编号无效');
      }

      return await send(
        confirmBubble({
          ...base,
          title: makeup ? '确认补签' : '确认兑换',
          target: [
            `物品：${quote.checkin ? `补签第 ${quote.day} 天 · ${signRewards(quote.checkin).join('、')}` : `${quote.reward?.name} ×${quote.reward?.quantity}`}`,
            `有效期：${formatGameTime(quote.expiresAt, 'MM-DD HH:mm')}`
          ],
          costs: [`消耗：${currencyNames[quote.currency]} ×${quote.price}`],
          actions: [{ label: '确认', command: `/半月活动 确认 ${quote.ref}` }],
          back: makeup ? back : { label: '返回商店', command: shop.command }
        })
      );
    }

    if (mode === '商店') {
      const currency = (Object.keys(currencyNames) as Currency[]).find(code => currencyNames[code] === value) ?? 'JADE';
      const products = (overview.products ?? []).map((product, index) => ({ product, index })).filter(entry => entry.product.currency === currency);
      const total = Math.max(1, Math.ceil(products.length / 6));
      const current = Math.min(total, Math.max(1, Math.trunc(Number(extra) || 1)));
      const items = products.slice((current - 1) * 6, current * 6).map(({ product, index }) => {
        const remaining = product.limit - (overview.progress.bought[product.id] ?? 0);

        return {
          title: product.reward.name,
          id: index + 1,
          lines: [`数量：×${product.reward.quantity} · 支付：${product.price} ${currencyNames[currency]}`, `剩余：${remaining} 次`],
          actions: remaining > 0 ? [{ label: '兑换', command: `/半月活动 兑换 ${index + 1}` }] : []
        };
      });

      return await send(
        listBubble({
          ...base,
          title: `半月商店 · ${currencyNames[currency]}`,
          header: Object.values(currencyNames).map(name => ({ label: name, command: `/半月活动 商店 ${name}` })),
          items: [
            { lines: [`时间：兑换至 ${formatGameTime(overview.endsAt, 'MM-DD HH:mm')}`, ...(!products.length ? ['状态：当前没有开放商品'] : [])] },
            ...items
          ],
          nav: total > 1 ? { current, total, count: products.length, command: `/半月活动 商店 ${currencyNames[currency]} {page}` } : undefined,
          footer: [back]
        })
      );
    }

    const signed = overview.progress.signs.filter(Boolean).length;
    const lines = [
      `状态：${overview.month} · ${overview.day ? `第 ${overview.day} 天` : '未开放'}`,
      `时间：${formatGameTime(overview.startsAt, 'MM-DD HH:mm')} 至 ${formatGameTime(overview.endsAt, 'MM-DD HH:mm')}`,
      `进度：签到 ${signed}/7 · 当月仙玉 ${overview.jade}`
    ];
    const footer: BubbleAction[] = [];

    if (overview.task) {
      const dayIndex = overview.day - 1;

      lines.push(
        '',
        `玩法：${overview.task.name} · 进度 ${overview.progress.taskCounts[dayIndex]}`,
        `奖励：已获 ${overview.progress.taskJade[dayIndex]} 仙玉 · ${overview.task.tiers.map(tier => `${tier.count} 次 +${tier.jade}`).join(' / ')}`
      );
      if (!overview.progress.signs[dayIndex]) {
        footer.push({ label: '今日签到', command: `/半月活动 签到 ${overview.day} ${overview.month}` });
      }
      const missed = overview.progress.signs.slice(0, dayIndex).flatMap((sign, index) => (sign ? [] : [index + 1]));

      if (missed.length) {
        lines.push(`说明：漏签第 ${missed.join('、')} 天 · 补签每次 ${overview.makeupPrice} 道晶 · 发送 /半月活动 补签 天数`);
      }
      if (taskCommands[overview.task.action]) {
        footer.push({ label: '前往任务', command: taskCommands[overview.task.action] });
      }
      footer.push(shop);
    }
    const availableBox = overview.unopened[0];

    if (availableBox && monthPattern.test(availableBox)) {
      lines.push(`宝箱：${overview.unopened.length} 个待开启 · 发送 /半月活动 开礼盒 月份`);
      footer.push({ label: '开启礼盒', command: `/半月活动 开礼盒 ${availableBox}` });
    } else {
      lines.push('宝箱：签到凑齐 7 天可获得随机礼盒');
    }

    return await send(buildBubble({ ...base, title: '半月活动', sections: [{ lines }], footer }));
  } catch (error) {
    return await send(errorBubble({ ...base, title: '半月活动', reason: `说明：${getCommandErrorMessage(error)}`, footer: [back] }));
  }
});
