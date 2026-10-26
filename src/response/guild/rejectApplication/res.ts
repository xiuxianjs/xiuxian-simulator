import { useMessage } from '@src/utils/useMessage';
/**
 * 宗门审核拒绝指令响应处理
 * 指令格式: /宗门审核拒绝 <UID|@目标>
 * 拒绝玩家加入宗门（仅长老及以上）
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildApplicationDecision } from '@src/api/bot/guild-application-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { Format, logger, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    // 解析指令参数
    const target = await resolveRobotTarget(e.MessageText || '', mention);
    const loaded = await runRobotBusiness(e, 'guild.application-reject', { target }, parseRobotGuildApplicationDecision, next, async reply => {
      const md = Format.createMarkdown();

      if (reply.heading) {
        md.addBold(reply.heading);
        md.addNewline();
      }
      md.addText(reply.text);
      await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: reply.buttons }));
    });

    if (loaded.handled) {
      return;
    }
    if (loaded.data.outcome === 'no_target') {
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '',
          content: Format.createMarkdown().addText('未能确定审核对象，请从本宗门当前待审核申请中选择有效玩家，再决定是否拒绝。'),
          footer: [{ label: '查看待审核申请', command: '/宗门审核' }]
        })
      );

      return;
    }
    const md = Format.createMarkdown();

    md.addBold('✅ 审核成功');
    md.addNewline();
    md.addText(loaded.data.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '继续审核', command: '/宗门审核' }] }));
  } catch (error) {
    logger.error('宗门审核拒绝指令处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('审核操作失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
