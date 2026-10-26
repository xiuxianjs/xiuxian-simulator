import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendVipPrivileges } from '@src/api/bot/vip-privileges-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = isPrivateEvent(e);
  const footer = [
    { label: '返回权益', command: '/我的权益' },
    { label: '充值购买', command: '/充值' }
  ];
  const send = async (content: ReturnType<typeof Format.createMarkdown>) => {
    await message.send(FormatGui({ isPrivate, bid, title: '我的特权', content, footer }));
  };

  try {
    const loaded = await runRobotBusiness(e, 'membership.privileges', {}, parseBackendVipPrivileges, next, reply => send(Format.createMarkdown().addText(reply.text))
    );

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const md = Format.createMarkdown();

    const mode = e.MessageText.includes('未解锁') ? 'locked' : e.MessageText.includes('月卡') ? 'month' : 'active';

    if (mode !== 'month') {
      md.addText(`VIP ${data.vipLevel} · 累计充值 ¥${(data.totalRechargeAmount / 100).toFixed(2)}`).addNewline();
    }
    const rows =
      mode === 'month'
        ? data.monthCardPrivileges
        : data.vipPrivileges.filter(row => mode === 'locked' ? !row.unlocked : row.unlocked && (row.minLevel === undefined || row.minLevel === data.vipLevel)
          );

    md.addText(mode === 'locked' ? '未解锁特权' : mode === 'month' ? `月卡特权 · ${data.hasMonthCard ? '生效中' : '未生效'}` : '当前已生效特权').addNewline();
    if (!rows.length) {
      md.addText('暂无对应特权');
    }
    const totalPage = Math.max(1, Math.ceil(rows.length / 5));
    const requestedPage = Number(e.MessageText.match(/\s+(\d+)$/)?.[1] ?? 1);
    const page = Number.isSafeInteger(requestedPage) ? Math.min(totalPage, Math.max(1, requestedPage)) : 1;
    const pageCommand = mode === 'locked' ? '/我的特权 未解锁 {page}' : mode === 'month' ? '/我的特权 月卡 {page}' : '/我的特权 {page}';

    for (const row of rows.slice((page - 1) * 5, page * 5)) {
      md.addBlockquote(
        createQuoteMarkdown([
          mode === 'locked' && row.minLevel !== undefined ? `VIP ${row.minLevel} · ${row.text}` : row.text,
          ...(row.needText ? [row.needText] : [])
        ])
      );
    }

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的特权',
        content: md,
        nav: totalPage > 1 ? { current: page, total: totalPage, count: rows.length, command: pageCommand } : undefined,
        header: [
          { label: '已生效', selected: mode === 'active', command: '/我的特权' },
          { label: '未解锁', selected: mode === 'locked', command: '/我的特权 未解锁' },
          { label: '月卡', selected: mode === 'month', command: '/我的特权 月卡' }
        ],
        footer: [{ label: '月卡奖励', command: '/我的权益 月卡' }, ...footer]
      })
    );
  } catch (error) {
    logger.error('我的特权查询失败:', error);
    await send(Format.createMarkdown().addText('特权状态暂未获取，请稍后重试。'));
  }
});
