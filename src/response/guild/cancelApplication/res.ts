import { useMessage } from '@src/utils/useMessage';
/**
 * 取消宗门申请指令响应处理
 * 指令格式: /取消宗门申请 申请编号
 * 取消指定的宗门申请
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildApplicationCancel } from '@src/api/bot/guild-application-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    // 解析指令参数
    const messageText = e.MessageText ?? '';
    const match = messageText.match(/^[!！/#＃]?取消宗门申请\s*(\d+)?$/);

    const applicationNumber = match?.[1];

    const loaded = await runRobotBusiness(
      e,
      'guild.application-cancel',
      { applicationId: applicationNumber ? parseInt(applicationNumber, 10) : null },
      parseRobotGuildApplicationCancel,
      next,
      async reply => {
        const md = Format.createMarkdown();

        if (reply.heading) {
          md.addBold(reply.heading);
        }
        md.addText(reply.text);
        if (reply.heading) {
          md.addText('');
          md.addText('可能的原因：');
          md.addText('• 申请编号不存在');
          md.addText('• 申请已被处理');
          md.addText('• 申请不属于您');
        }
        await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: reply.buttons }));
      }
    );

    if (loaded.handled) {
      return;
    }
    const result = loaded.data;

    // 如果没有提供编号，显示用户的申请列表
    if (result.outcome === 'list') {
      const pendingApps = result.pendingApps;

      if (pendingApps.length === 0) {
        const md = Format.createMarkdown();

        md.addBold('无待处理申请');
        md.addNewline();
        md.addText('您当前没有待审核的宗门申请');
        md.addNewline();
        md.addText('');
        md.addNewline();
        md.addText('您可以申请加入新的宗门');

        void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '查看宗门列表', command: '/宗门列表' }] }));

        return;
      }

      // 显示待处理申请列表
      const appListText = pendingApps
        .map((app, index) => {
          return [`**【${index + 1}】${app.guildName}**`, `申请编号：${app.id}`, `状态：${app.status}`, ''].join('\n');
        })
        .join('\n');

      const md = Format.createMarkdown();

      md.addBold('待处理的申请');
      md.addText(`您有 ${pendingApps.length} 个待审核的申请`);
      md.addText('');
      md.addText(appListText);
      md.addText('**使用说明：**');
      md.addText('输入 /取消宗门申请 申请编号 来取消申请');
      md.addText('例如：/取消宗门申请 1001');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '取消申请', command: '/取消宗门申请' }] }));

      return;
    }

    // 取消成功；失败已由同次API反馈并结束。
    const md = Format.createMarkdown();

    md.addBold('✅ 取消成功');
    md.addNewline();
    md.addText(result.message);
    md.addNewline();
    md.addText('');
    md.addNewline();
    md.addText('您可以继续申请其他宗门');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          { label: '查看宗门列表', command: '/宗门列表' },
          { label: '查看我的申请', command: '/我的申请' }
        ]
      })
    );
  } catch (error) {
    logger.error('取消宗门申请指令处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('取消申请失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
