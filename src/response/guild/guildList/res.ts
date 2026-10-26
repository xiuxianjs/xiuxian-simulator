import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildList } from '@src/api/bot/guild-directory-robot-query';
/**
 * 宗门列表指令响应处理
 * 指令格式: /宗门列表
 * 显示所有现有宗门信息
 */

import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;

  try {
    // 解析指令参数
    const messageText = e.MessageText ?? '';
    const match = messageText.match(/^[!！/#＃]?宗门列表(?:\s+(\d+))?$/);

    let page = match?.[1] ? parseInt(match[1], 10) : 1;

    // 验证页码合法性
    if (page < 1 || !Number.isInteger(page)) {
      page = 1;
    }

    const loaded = await runRobotBusiness(e, 'guild.list', { page }, parseRobotGuildList, next, async reply => {
      await message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '宗门列表',
          content: reply.quote ? createQuoteMarkdown([reply.text]) : Format.createMarkdown().addText(reply.text)
        })
      );
    });

    if (loaded.handled) {
      return;
    }
    const { result, canCreateOrApplyGuild, redirected } = loaded.data;

    if (!result) {
      return;
    }
    if (redirected) {
      const subMd = Format.createMarkdown();

      subMd.addBlockquote(Format.createMarkdown().addText(`页码超出范围，已自动跳转到最后一页（第 ${result.currentPage} 页）`));

      void message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '宗门列表',
          header: canCreateOrApplyGuild ? [{ label: '创建宗门', command: '/创建宗门' }] : [],
          content: subMd
        })
      );

      void handleGuildListDisplay(result, message, bid, e.isPrivate ?? false, canCreateOrApplyGuild);

      return;
    }
    void handleGuildListDisplay(result, message, bid, e.isPrivate ?? false, canCreateOrApplyGuild);
  } catch (error) {
    logger.error('[宗门列表] 处理错误:', error);
    const errMd = Format.createMarkdown();

    errMd.addBlockquote(Format.createMarkdown().addText('获取宗门列表失败，请稍后重试'));

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '宗门列表',
        content: errMd
      })
    );
  }
});

// 提取显示逻辑为独立函数
function handleGuildListDisplay(result: any, message: any, bid: string | undefined, isPrivate: boolean, canCreateOrApply?: boolean) {
  try {
    if (result.total === 0) {
      const subMd = Format.createMarkdown();

      subMd.addBlockquote(
        Format.createMarkdown().addText(canCreateOrApply ? '当前还没有任何宗门创建，您可以使用 /创建宗门 指令创建一个新宗门' : '当前还没有任何宗门创建')
      );

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '暂无宗门',
          header: canCreateOrApply ? [{ label: '创建宗门', command: '/创建宗门' }] : [],
          content: subMd
        })
      );

      return;
    }

    // 构建宗门列表显示
    const contentMd = Format.createMarkdown();

    result.guilds.forEach((guild: any) => {
      const levelInfo = guild.levelName ? `${guild.levelName}` : '';

      const titles = guild.titles?.filter((t: string) => t?.trim()).map((t: string) => t.trim()) ?? [];
      const lines = [
        `【${guild.id}】${guild.name}-${levelInfo}-${guild.memberCount}人`,
        `称号：${titles.length > 0 ? titles.join('、') : '无'}`,
        `简介：${guild.intro}`
      ];

      if (guild.minRealmName) {
        lines.push(`入宗要求：${guild.minRealmName}及以上`);
      }
      contentMd.addBlockquote(createQuoteMarkdown(lines, canCreateOrApply ? [{ label: '加入', command: `/加入宗门 ${guild.id}` }] : []));
      contentMd.addNewline();
    });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门列表',
        header: [...(canCreateOrApply ? [{ label: '创建宗门', command: '/创建宗门' }] : []), { label: '我的申请', command: '/我的申请' }],
        content: contentMd,
        nav: {
          current: result.currentPage,
          total: result.totalPages,
          count: result.total,
          command: '/宗门列表 {page}'
        }
      })
    );
  } catch (error) {
    logger.error('[宗门列表显示] 处理错误:', error);
    const errMd = Format.createMarkdown();

    errMd.addBlockquote(Format.createMarkdown().addText('显示宗门列表失败，请稍后重试'));

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '宗门列表',
        content: errMd
      })
    );
  }
}
