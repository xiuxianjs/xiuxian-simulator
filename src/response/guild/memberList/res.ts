import { formatGameDate } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildMembers } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { listBubble } from '@src/response/presentation/presets';
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

  // 列表条目：对象行 + 一行事实 + 行内按钮（DESIGN §6.1）。
  const items = members.map(member2 => {
    const role = member2.isDeputy ? '代理宗主' : member2.roleName;
    const leave = member2.isOnLeave && member2.leaveEndAt ? ` · 请假至${formatGameDate(member2.leaveEndAt)}` : '';

    return {
      title: `${role} · ${member2.userName}`,
      id: member2.userId,
      lines: [`日活：${member2.dailyActivity} · 周活：${member2.weeklyActivity}${leave}`],
      actions:
        member2.userId !== userId
          ? [
              { label: '查看', command: `/查看信息 ${member2.userId}` },
              { label: '飞信', command: `/发飞信 ${member2.userId} ` }
            ]
          : []
    };
  });

  void message.send(
    listBubble({
      isPrivate,
      bid,
      title: `宗门成员 · ${guildName}`,
      items,
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
