import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { formatGameDate } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
/**
 * 查看宗门精华
 * 指令格式: /宗门精华 [页码]
 */
import { createGuildEssenceButtons } from '@src/markdown/buttons/guild';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGuildEssences } from '@src/api/bot/guild-content-robot-query';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  // 解析页码参数
  const messageText = e.MessageText || '';
  const match = messageText.match(/^[!！/#＃]?宗门精华(?:\s+(\d+))?$/);
  let page = match?.[1] ? parseInt(match[1], 10) : 1;

  // 验证页码合法性
  if (page < 1 || !Number.isInteger(page)) {
    page = 1;
  }

  const send = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(e, 'guild.essences', { page }, parseRobotGuildEssences, next, async reply => {
      await send(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    handleEssenceDisplay(loaded.data, message, bid, Number(e.uid), isPrivate);
  } catch (error) {
    await send(error instanceof Error ? error.message : '查询精华失败');
  }
});

// 提取显示逻辑为独立函数
function handleEssenceDisplay(result: any, message: any, bid: string | undefined, _uid: number, isPrivate = false) {
  try {
    if (!result.success) {
      const md = Format.createMarkdown();

      md.addText(result.message ?? '查询失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (!result.essences || result.essences.length === 0) {
      const md = Format.createMarkdown();

      md.addBold(`【${result.guildName}】宗门精华`);
      md.addNewline();
      md.addButton(markdownButtonLabel('返回'), { data: '/我的宗门' });
      md.addText(' ');
      md.addButton(markdownButtonLabel('添加'), { data: '/添加精华' });
      md.addNewline();
      md.addText('暂无精华内容');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const md = Format.createMarkdown();

    md.addBold(`【${result.guildName}】宗门精华`);
    md.addNewline();
    md.addText(`第 ${result.currentPage}/${result.totalPages} 页，共 ${result.total} 条精华`);
    md.addNewline();
    md.addNewline();

    result.essences.forEach((essence: any, index: number) => {
      const date = formatGameDate(essence.createdAt);

      md.addText(`【${essence.id}】 ${essence.content}`);
      md.addNewline();
      md.addText(`  创建者：${essence.creatorName} | ${date}`);

      addOptions(md, [{ label: '移除', command: `/移除精华 ${essence.id}` }]);

      if (index < result.essences!.length - 1) {
        md.addNewline();
      }
    });

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: createGuildEssenceButtons(result.currentPage, result.totalPages) }));
  } catch (error) {
    logger.error('[宗门精华] 显示错误:', error);
    const md = Format.createMarkdown();

    md.addText('显示宗门精华失败，请稍后重试');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
}
