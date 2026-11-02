import { useMessage } from '@src/utils/useMessage';
import { createGuildRedPacketButtons } from '@src/markdown/buttons/guild';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildRedPackets } from '@src/api/bot/guild-red-packets-queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { section } from '@src/response/presentation/sections';
import { Format, onResponse, useEvent } from 'alemonjs';
/**
 * 宗门红包列表指令
 * 指令格式：/宗门红包 或 /宗门红包 页码
 *
 * 红包可领取状态与展示数据由服务端返回。
 */

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const msgText = e.MessageText ?? '';
  const match = msgText.match(/^[!！/#＃]?宗门红包(?:\s*(\d+))?$/);

  let page = match?.[1] ? parseInt(match[1], 10) : 1;

  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'guild.red-packets', {}, parseGuildRedPackets, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '获取红包列表失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const guildName = loaded.data.guildName !== null && loaded.data.guildName !== '' ? loaded.data.guildName : '未知宗门';
  const available = loaded.data.packets;

  const limit = 5;
  const offset = (page - 1) * limit;

  if (available.length === 0) {
    const md = Format.createMarkdown();

    md.addText('没有可领红包。');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          { label: '发红包', command: '/发红包' },
          { label: '我发的红包', command: '/我发的红包' }
        ]
      })
    );

    return;
  }

  const totalPages = Math.max(1, Math.ceil(available.length / limit));
  const requestedPage = page;

  if (requestedPage > totalPages) {
    const md = Format.createMarkdown();

    md.addBold(`【${guildName}】宗门红包`);
    md.addNewline();
    md.addText(`页码超出范围：总页数为 ${totalPages} 页`);
    md.addNewline();
    md.addText('请在有效范围内输入页码，例如：/宗门红包 1');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const pageList = available.slice(offset, offset + limit);

  const md = Format.createMarkdown();

  for (const p of pageList) {
    const remainTimeStr = p.expiresAt ? `剩余时间：${p.remainingTimeText}` : '';

    md.addBlockquote(
      section({
        title: p.currencyName,
        id: p.id,
        lines: [`每份：×${Number(p.perAmount)} · 剩余份数：${p.remaining}${remainTimeStr ? ` · ${remainTimeStr}` : ''}`],
        actions: [{ label: '领取', command: `/领红包 ${p.id}` }]
      })
    );
    md.addNewline();
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: `宗门红包 · ${guildName}`,
      content: md,
      footer: createGuildRedPacketButtons(page, totalPages),
      nav: { current: page, total: totalPages, command: '/宗门红包 {page}' }
    })
  );
});
