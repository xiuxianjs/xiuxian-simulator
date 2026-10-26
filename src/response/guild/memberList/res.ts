import { formatGameDate } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildMembers } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const text = (e.MessageText ?? '').trim();
  const match = text.match(/^[!！/#＃]?宗门成员列表(?:\s+(\d+))?$/);
  const page = Math.max(1, Number(match?.[1] ?? 1));

  const loaded = await runRobotBusiness(e, 'guild.members', { page }, parseGuildMembers, next, async reply => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
  });

  if (loaded.handled) {
    return;
  }
  const userId = e.uid;
  const { guildName, members, page: currentPage, totalPages, total } = loaded.data;

  const md = Format.createMarkdown();

  // 格式化成员列表（借鉴万宝楼排版）
  for (const member2 of members) {
    // 标题行：职位 + 名字
    let titleLine = '';

    if (member2.isDeputy) {
      titleLine += `【代理宗主】${member2.userName}`;
    } else {
      titleLine += `【${member2.roleName}】${member2.userName}`;
    }

    if (member2.isOnLeave && member2.leaveEndAt) {
      const endDate = formatGameDate(member2.leaveEndAt);

      titleLine += ` (请假至${endDate})`;
    }

    const actions =
      member2.userId !== userId
        ? [
            { label: '查看', command: `/查看信息 ${member2.userId}` },
            { label: '飞信', command: `/发飞信 ${member2.userId} ` }
          ]
        : [];

    md.addBlockquote(createQuoteMarkdown([titleLine, `ID:${member2.userId}  日活:${member2.dailyActivity}  周活:${member2.weeklyActivity}`], actions));
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: `【${guildName}】成员列表`,
      content: md,
      footer: [
        { label: '返回', command: '/我的宗门' },
        { label: '宗门飞信', command: '/飞信 宗门' }
      ],
      nav: {
        current: currentPage,
        total: totalPages,
        count: total,
        command: '/宗门成员列表 {page}'
      }
    })
  );
});
