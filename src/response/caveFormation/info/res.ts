import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveFormations } from '@src/api/bot/cave-formation-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const layoutCommand = '/储物袋 道具 其它';

  const renderFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave-formations.list', { ...reply, title: reply.title || '洞府阵法' }), 'footer')
  );

  try {
    const [, next] = useEvent();
    const response = await runRobotBusiness(e, 'cave-formations.list', {}, parseBackendCaveFormations, next, renderFailure);

    if (response.handled) {
      return;
    }
    const active = response.data;
    const md = Format.createMarkdown();

    if (active.length === 0) {
      md.addText('暂无生效中的洞府阵法');
      appendMiddlewareAdvice(
        md,
        withBusinessRecovery('cave-formations.list', { title: '', heading: '', text: '暂无生效中的洞府阵法', buttons: [], advice: [] }).advice
      );
    } else {
      for (const item of active) {
        const quote = Format.createMarkdown().addText(`【${item.categoryLabel}】${item.formationName}`);

        quote.addText(' ').addButton(markdownButtonLabel('替换'), { data: `${layoutCommand} 洞府阵法` });
        quote.addText(' ').addButton(markdownButtonLabel('移除'), { data: `/移除阵法 ${item.formationName}` });
        quote.addNewline().addText(` 剩余 ${item.remainingText} `).addNewline().addText(` ${item.effectText} `);
        md.addBlockquote(quote);
      }
    }

    const footerButtons = [{ label: '背包', command: layoutCommand }];

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '洞府阵法',
        content: md,
        footer: footerButtons
      })
    );
  } catch (error) {
    logger.error('获取洞府阵法失败:', error);
    await renderFailure({ title: '', heading: '', text: '获取洞府阵法失败，请稍后重试。', buttons: [], advice: [] });
  }
});
