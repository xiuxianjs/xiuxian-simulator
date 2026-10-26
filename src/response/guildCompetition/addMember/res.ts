import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { competitionMemberAddArguments, parseRobotCompetitionMemberAdd } from '@src/api/bot/competition-member-add-robot-query';
import { selects } from '@src/response/config';
import type { GuiButton } from '@src/utils/messageHelper';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

const formatBattleSummary = (power: number) => {
  return `战力✊${power}`;
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const args = await competitionMemberAddArguments(e.MessageText ?? '', mention);
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);
    if (args.mode === 'direct') {
      md.addNewline();
    }
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md,
        ...(args.mode === 'direct' ? { footer: [{ label: '宗门大比', command: '/宗门大比' }] } : {})
      })
    );
  };
  const loaded = await runRobotBusiness(e, 'competition.member-add', args, parseRobotCompetitionMemberAdd, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(
      error instanceof Error ? error.message : args.mode === 'direct' ? '添加失败' : args.mode === 'positions' ? '获取位置信息失败' : '获取成员列表失败'
    );

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const result = loaded.data;

  if (result.outcome === 'no_target') {
    return;
  }
  if (result.outcome === 'result') {
    const md = Format.createMarkdown();

    md.addText(result.receipt.message);
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md,
        footer: [{ label: '宗门大比', command: '/宗门大比' }]
      })
    );

    return;
  }

  if (result.outcome === 'list') {
    const { members, page, totalPages, count } = result.data;
    const md = Format.createMarkdown();

    for (const m of members) {
      md.addBlockquote(
        createQuoteMarkdown(
          [`【${m.userId}】${m.name}`, formatBattleSummary(m.power)],
          [
            { label: '选择', command: `/添加宗门大比成员 ${m.userId}` },
            { label: '查看面板', command: `/查看信息 ${m.userId}` }
          ]
        )
      );
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门大比 - 添加成员',
        header: [{ label: '返回', command: '/宗门大比' }],
        content: md,
        nav: totalPages > 1 ? { current: page, total: totalPages, count, command: '/添加宗门大比成员 p{page}' } : undefined
      })
    );

    return;
  }

  if (result.outcome === 'positions') {
    const targetUid = result.targetUid;
    const { availablePositions } = result;
    const md = Format.createMarkdown();

    md.addText('请选择要添加到的位置：');
    const footer: GuiButton[] = [];

    md.addNewline();
    for (const pos of availablePositions) {
      footer.push({ label: `位置${pos}`, command: `/添加宗门大比成员 ${targetUid} ${pos}` });
    }

    void message.send(FormatGui({ isPrivate, bid, title: '宗门大比 - 选择位置', header: [{ label: '返回', command: '/宗门大比' }], content: md, footer }));

    return;
  }

  // 默认提示
  {
    const md = Format.createMarkdown();

    md.addText('指令格式：/添加宗门大比成员 [弟子UID/@目标] [位置(1-6)]');

    void message.send(FormatGui({ isPrivate, bid, title: '宗门大比', header: [{ label: '返回', command: '/宗门大比' }], content: md }));
  }
});
