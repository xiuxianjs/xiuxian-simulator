import { useMessage } from '@src/utils/useMessage';
/**
 * 我的故事指令处理器
 * 指令：/我的故事
 * 展示玩家数据统计与故事化诠释
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendStory } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendFailure = (text: string) => message.send(FormatGui({ isPrivate, bid, title: '我的故事', content: Format.createMarkdown().addText(text) }));

  try {
    const loaded = await runRobotBusiness(e, 'personal-history.story', {}, parseBackendStory, next, async reply => {
      await sendFailure(reply.text);
    });

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const md = Format.createMarkdown();

    const { items, name, canShowMemoryButton } = data;

    md.addBlockquote(Format.createMarkdown().addText(`${name}，这是你的故事。`));

    items.forEach(item => {
      md.addText(`【${item.label}】${item.value}`);
      md.addNewline();
      md.addBlockquote(Format.createMarkdown().addText(item.flavor));
    });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的故事',
        content: md,
        footer: canShowMemoryButton ? [{ label: '我的回忆', command: '/我的回忆' }] : undefined
      })
    );
  } catch (error) {
    logger.error('我的故事加载失败:', error);
    await sendFailure('故事加载失败，请稍后再试');
  }
});
