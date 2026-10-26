import { useMessage } from '@src/utils/useMessage';
/**
 * 踢出宗门成员
 * 指令格式: /踢出成员 [UID|@目标]
 * 不带ID时显示可踢出的成员列表
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildKick } from '@src/api/bot/guild-kick-robot-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { Format, onResponse, useEvent, useMention } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  // 解析指令参数
  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?踢出成员(?:\s+(.+))?$/);

  if (!match) {
    return;
  }

  const sendText = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  let loaded;

  try {
    const target = match[1] ? await resolveRobotTarget(text, mention) : null;

    loaded = await runRobotBusiness(e, 'guild.kick', { mode: match[1] ? 'action' : 'directory', target }, parseRobotGuildKick, next, async reply => {
      await sendText(reply.text);
    });
  } catch (error) {
    await sendText(error instanceof Error ? error.message : '操作失败');

    return;
  }
  if (loaded.handled || loaded.data.outcome === 'no_target') {
    return;
  }
  if (loaded.data.outcome === 'result') {
    await sendText(loaded.data.message);

    return;
  }
  const kickable = loaded.data.members;

  if (kickable.length === 0) {
    const md4 = Format.createMarkdown();

    md4.addText('当前没有可踢出的成员，或您没有踢人权限');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md4 }));

    return;
  }

  const contentMd = Format.createMarkdown();

  // sub
  contentMd.addBlockquote(Format.createMarkdown().addText('点击 [踢出] 可直接踢出对应成员'));

  // 按职位分组显示
  const roleOrder = ['副宗主', '长老', '弟子'];

  for (const role of roleOrder) {
    const group = kickable.filter(m => m.roleName === role);

    if (group.length === 0) {
      continue;
    }

    contentMd.addText(`── ${role} ──`);
    contentMd.addNewline();

    for (const m of group) {
      contentMd.addBlockquote(createQuoteMarkdown([`${m.userName}（ID：${m.userId}）`], [{ label: '踢出', command: `/踢出成员 ${m.userId}` }]));
    }

    contentMd.addNewline();
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '踢出成员',
      header: [{ label: '返回', command: '/我的宗门' }],
      content: contentMd
    })
  );
});
