import { useMessage } from '@src/utils/useMessage';
/**
 * 我的回忆指令处理器
 * 指令：/我的回忆
 * 展示玩家个人历程中几个关键"第一次"节点，以故事化短文呈现
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendMemories } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendFailure = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '我的回忆', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(e, 'personal-history.memories', {}, parseBackendMemories, next, async reply => {
      await sendFailure(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const md = Format.createMarkdown();

    const { items, totalDays, name } = data;

    md.addBlockquote(Format.createMarkdown().addText(`${name}，你已在这片天地走过了 ${totalDays} 天。`));

    items.forEach(item => {
      md.addText(`【${item.label}】`);
      md.addNewline();
      md.addText(item.text);
      if (item.subtext) {
        md.addNewline();
        md.addBlockquote(Format.createMarkdown().addText(item.subtext));
      }
      md.addNewline();
      md.addNewline();
    });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的回忆',
        content: md,
        footer: data.canShowStoryButton ? [{ label: '我的故事', command: '/我的故事' }] : undefined
      })
    );
  } catch (error) {
    logger.error('我的回忆加载失败:', error);
    await sendFailure('回忆加载失败，请稍后再试');
  }
});
