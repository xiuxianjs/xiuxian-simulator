import { useMessage } from '@src/utils/useMessage';
import { createGuildLogButtons } from '@src/markdown/buttons/guild';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildLogs } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
/**
 * 宗门日志指令
 * 指令格式：/宗门日志 [页数]
 * 展示当前玩家所在宗门的日志列表，支持分页查看
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  // 解析指令参数：页码可选，默认 1
  const messageText = e.MessageText ?? '';
  const match = messageText.match(/^[!！/#＃]?宗门日志(?:\s*(\d+))?$/);

  let page = match?.[1] ? parseInt(match[1], 10) : 1;

  if (page < 1 || !Number.isInteger(page)) {
    page = 1;
  }

  const loaded = await runRobotBusiness(e, 'guild.logs', { page }, parseGuildLogs, next, async reply => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
  });

  if (loaded.handled) {
    return;
  }
  const { guildName, logs, total, totalPages, page: actualPage } = loaded.data;

  // 构建展示内容
  const md = Format.createMarkdown();

  md.addBold(`【${guildName}】宗门日志`);
  md.addNewline();

  if (total === 0 || !logs || logs.length === 0) {
    md.addText('暂无日志');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  logs.forEach((item: any, index: number) => {
    md.addText(item.content);
    md.addNewline();
    md.addText(`时间：${item.formattedTime}`);

    if (index < logs.length - 1) {
      md.addNewline();
      md.addNewline();
    }
  });

  md.addNewline();
  md.addText(`第 ${actualPage}/${totalPages} 页，共 ${total} 条日志`);
  md.addNewline();

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: createGuildLogButtons(actualPage, totalPages) }));
});
