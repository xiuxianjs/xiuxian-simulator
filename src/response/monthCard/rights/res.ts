import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendRechargeRights } from '@src/api/bot/recharge-rights-queries';
import { getBackendFirstRechargeInfo } from '@src/api/bot/first-recharge-queries';
import { getBackendWorldMilestoneView } from '@src/api/bot/world-milestone-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { formatGameTime, formatGameDate } from '@src/utils/gameTime';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = isPrivateEvent(e);
  const detail = e.MessageText.trim()
    .replace(/^[/#＃!！]?我的权益\s*/, '')
    .replace(/\s+\d+$/, '');
  const footer = [
    { label: '返回权益', command: '/我的权益' },
    { label: '充值', command: '/充值' }
  ];
  const send = async (title: string, content: ReturnType<typeof Format.createMarkdown>) => {
    await message.send(FormatGui({ isPrivate, bid, title, content, footer }));
  };

  try {
    const loaded = await runRobotBusiness(e, 'membership.rights', {}, parseBackendRechargeRights, next, reply => send('我的权益', Format.createMarkdown().addText(reply.text))
    );

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const md = Format.createMarkdown();
    const block = (lines: string[], buttons: { label: string; command: string }[] = []) => {
      md.addBlockquote(createQuoteMarkdown(lines.filter(Boolean), buttons));
    };
    const status = (active: boolean, expire: string | null) => (active ? '生效中' : expire ? '已过期' : '未开通');
    const expiry = (active: boolean, expire: string | null) => (expire ? `${active ? '到期' : '已到期'}：${formatGameTime(expire, 'YYYY-MM-DD HH:mm')}` : '');
    const mc = data.monthCard;
    const sp = data.seclusionPass;

    if (detail === '月卡' || detail === '月卡日历') {
      block([
        `月卡 · ${status(mc.active, mc.expireTime)}${mc.package ? ` · ¥${mc.package.priceAmount / 100}` : ''}`,
        expiry(mc.active, mc.expireTime),
        `剩余 ${mc.remainingDays} 天 · 可续期 ${mc.remainingQuota} 天 · 上限 ${mc.maxDays} 天`
      ]);
      block(
        [
          `可领 ${mc.daily.claimableCount} 天 · 累计已发 ${mc.daily.claimedCount} 天 · 后续待发 ${mc.daily.upcomingCount} 天`,
          '奖励按北京时间逐日解锁，到期后仍可补领已解锁奖励',
          ...((mc.daily.prepaidCount ?? 0) > 0 ? [`未解锁的 ${mc.daily.prepaidCount} 天奖励已历史发放，不会重复领取`] : []),
          ...(mc.daily.reviewRequired ? ['月卡购买记录待核对，暂不可领取，请联系管理员'] : [])
        ],
        [
          ...(mc.daily.claimableCount > 0 ? [{ label: '领取', command: '/一键领取月卡' }] : []),
          { label: detail === '月卡日历' ? '月卡详情' : '奖励日历', command: detail === '月卡日历' ? '/我的权益 月卡' : '/我的权益 月卡日历' }
        ]
      );
      if (detail === '月卡日历') {
        const pageInput = e.MessageText.match(/月卡日历\s+(\d+)$/);
        const page = Math.max(1, Math.min(Math.ceil(mc.daily.calendarState.length / 7) || 1, Number(pageInput?.[1] ?? 1)));

        for (const day of mc.daily.calendarState.slice((page - 1) * 7, page * 7)) {
          block([
            `第 ${day.day} 天 · ${formatGameDate(day.rewardDate)} · ${day.prepaid ? '未解锁 · 历史已发' : mc.daily.reviewRequired && day.state === 'claimable' ? '待核对' : { claimed: '已领取', claimable: '可领取', upcoming: '未到领取日' }[day.state]}`
          ]);
        }
        if (!mc.daily.calendarState.length) {
          md.addText('暂无奖励日历');
        }
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '月卡奖励日历',
            content: md,
            nav: { current: page, total: Math.max(1, Math.ceil(mc.daily.calendarState.length / 7)), command: '/我的权益 月卡日历 {page}' },
            footer
          })
        );

        return;
      }
      if (data.monthCardInstantRewards.length) {
        block(['开通即得', ...data.monthCardInstantRewards]);
      }
      block(
        ['月卡奖励与特权'],
        [
          { label: '查看商品说明', command: '/充值 月卡' },
          { label: '查看月卡特权', command: '/我的特权 月卡' }
        ]
      );
      await send('月卡详情', md);

      return;
    }
    if (detail === '金手指') {
      block([`金手指 · ${status(sp.active, sp.expireTime)}`, expiry(sp.active, sp.expireTime), `剩余 ${sp.remainingDays} 天 · 时长上限 ${sp.maxDays} 天`]);
      block([data.seclusionPriceText, ...data.seclusionRewards], [{ label: sp.active ? '查看续期商品' : '查看开通商品', command: '/充值 金手指' }]);
      await send('金手指详情', md);

      return;
    }
    // Only the overview loads secondary summaries. Failed sections remain unknown.
    const [first, world] = await Promise.allSettled([getBackendFirstRechargeInfo(bid, e.uid as number), getBackendWorldMilestoneView(bid, e.uid as number)]);
    const countText = (count: number) => (count > 0 ? `${count} 档可领` : '暂无可领');

    block([`VIP ${data.vipLevel} · 累计充值 ¥${(data.totalRechargeAmount / 100).toFixed(2)}`, data.progressText], [{ label: '特权', command: '/我的特权' }]);
    block(
      [
        `月卡 · ${status(mc.active, mc.expireTime)}${mc.package ? ` · ¥${mc.package.priceAmount / 100}` : ''}`,
        expiry(mc.active, mc.expireTime),
        mc.daily.reviewRequired ? '月卡购买记录待核对，暂不可领取' : mc.daily.claimableCount > 0 ? `可领 ${mc.daily.claimableCount} 天（可补领）` : '暂无可领',
        ...((mc.daily.prepaidCount ?? 0) > 0 ? [`未解锁的 ${mc.daily.prepaidCount} 天奖励已历史发放，不会重复领取`] : [])
      ],
      [
        { label: '详情', command: '/我的权益 月卡' },
        ...(mc.package ? [{ label: mc.active ? '续期' : '开通', command: '/充值 月卡' }] : []),
        ...(mc.daily.claimableCount > 0 ? [{ label: '领取', command: '/一键领取月卡' }] : [])
      ]
    );
    block(
      [`金手指 · ${status(sp.active, sp.expireTime)}${sp.package ? ` · ¥${sp.package.priceAmount / 100}` : ''}`, expiry(sp.active, sp.expireTime)],
      [{ label: '详情', command: '/我的权益 金手指' }, ...(sp.package ? [{ label: sp.active ? '续期' : '开通', command: '/充值 金手指' }] : [])]
    );
    block(
      ['首充', first.status === 'fulfilled' ? countText(first.value.tiers.filter(t => t.status === 'claimable').length) : '状态暂未获取'],
      [{ label: '充值', command: '/充值' }]
    );
    block(
      [
        '世界里程碑',
        world.status === 'fulfilled'
          ? world.value.code === 'VIEW'
            ? `全服 ${world.value.worldCountText} 人 · ${countText(world.value.unclaimedCount)}`
            : '暂无里程碑配置'
          : '状态暂未获取'
      ],
      [
        { label: '详情', command: '/里程碑' },
        ...(world.status === 'fulfilled' && world.value.code === 'VIEW' && world.value.unclaimedCount > 0 ? [{ label: '领取', command: '/里程碑 领取' }] : [])
      ]
    );
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的权益',
        header: [{ label: '我的订单', command: '/我的订单' }],
        content: md,
        footer: [
          { label: '充值', command: '/充值' },
          { label: '新人返利', command: '/新人返利' },
          { label: '周周返利', command: '/周周返利' }
        ]
      })
    );
  } catch (error) {
    logger.error('我的权益查询失败:', error);
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的权益',
        content: Format.createMarkdown().addText('权益暂未获取。'),
        footer: [
          { label: '刷新', command: e.MessageText },
          { label: '我的订单', command: '/我的订单' }
        ]
      })
    );
  }
});
