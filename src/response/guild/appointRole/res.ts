import { useMessage } from '@src/utils/useMessage';
/**
 * 任命成员职位
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildRoleAppoint } from '@src/api/bot/guild-role-action-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  // 解析指令参数：设置身份为 职位名 uid
  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?设置身份为\s+(.+?)\s+(.+)$/);
  const [, roleName, targetArg] = match ?? [null, null, null];
  const mentioned = await mention.findOne();
  const targetBid = mentioned?.count && mentioned.data?.UserId ? mentioned.data.UserId : undefined;
  const parsedTargetUid = targetArg && /^\d+$/.test(targetArg.trim()) ? parseInt(targetArg.trim(), 10) : null;

  try {
    const loaded = await runRobotBusiness(
      e,
      'guild.role-appoint',
      { roleName: match ? roleName : null, targetUid: match ? parsedTargetUid : null, targetBid: match ? targetBid : undefined },
      parseRobotGuildRoleAppoint,
      next,
      async reply => {
        await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
      }
    );

    if (loaded.handled) {
      return;
    }
    const result = loaded.data;

    if (result.outcome === 'usage') {
      const md = Format.createMarkdown();

      md.addText('使用方法：设置身份为 职位名 <UID|@目标>');
      md.addNewline();
      md.addText('示例：设置身份为 长老 10000000002');
      md.addNewline();
      md.addNewline();
      md.addText(`可用职位：${result.roleList}`);
      md.addNewline();
      md.addNewline();
      md.addText('说明：');
      md.addNewline();
      md.addText('• 只有长老及以上职位才能任命成员');
      md.addNewline();
      md.addText('• 不能任命比自己职位高或相同的职位');
      md.addNewline();
      md.addText('• 任命时会检查职位上限');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const md = Format.createMarkdown().addText(result.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  } catch (error) {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '任命失败') }));
  }
});
