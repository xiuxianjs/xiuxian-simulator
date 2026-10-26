import { useMessage } from '@src/utils/useMessage';
/**
 * 我的申请指令响应处理
 * 指令格式: /我的申请
 * 查看自己的所有宗门申请记录
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildApplications } from '@src/api/bot/guild-application-queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();

  try {
    const loaded = await runRobotBusiness(e, 'guild.my-applications', {}, parseGuildApplications, next);

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;

    if (data.hasGuild) {
      const subMd = Format.createMarkdown();

      subMd.addBlockquote(Format.createMarkdown().addText(`您已是【${data.guildNameText}】的成员，加入宗门后无需查看申请记录`));

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '已加入宗门',
          content: subMd,
          footer: [{ label: '我的宗门', command: '/我的宗门' }]
        })
      );

      return;
    }

    // 获取用户待审核的申请
    const applications = data.applications;

    if (applications.length === 0) {
      const subMd = Format.createMarkdown();

      subMd.addBlockquote(Format.createMarkdown().addText('您还没有申请加入任何宗门，可以查看宗门列表并申请加入'));

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '暂无申请记录',
          content: subMd,
          footer: [{ label: '宗门列表', command: '/宗门列表' }]
        })
      );

      return;
    }

    // 构建申请列表
    const contentMd = Format.createMarkdown();

    // sub
    contentMd.addBlockquote(Format.createMarkdown().addText(`共有 ${applications.length} 条待审核申请`));

    applications.forEach(app => {
      contentMd.addBlockquote(
        createQuoteMarkdown(
          [`【${app.guildNameText}】 - ${app.statusText}`, `申请编号：${app.id}`, `申请时间：${app.createdDateText}`],
          app.canCancel ? [{ label: '取消', command: `/取消宗门申请 ${app.id}` }] : []
        )
      );
      contentMd.addNewline();
    });

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '我的待审核申请',
        footer: [{ label: '宗门列表', command: '/宗门列表' }],
        content: contentMd
      })
    );
  } catch (error) {
    logger.error('我的申请指令处理失败:', error);
    const errMd = Format.createMarkdown();

    errMd.addBlockquote(Format.createMarkdown().addText('获取申请记录失败，请稍后再试或联系运营'));

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '我的申请',
        content: errMd
      })
    );
  }
});
