import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseStorylineAllChestClaim } from '@src/api/bot/storyline-chest-claim';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

/**
 * 一键领取所有章节宝箱
 * /一键领取宝箱
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, parentNext] = useEvent();

  try {
    const resultMd = Format.createMarkdown();
    const response = await runRobotBusiness(e, 'storyline.chests-claim-all', {}, parseStorylineAllChestClaim, parentNext, async reply => {
      await message.send(
        FormatGui({
          isPrivate: e.isPrivate ?? false,
          bid,
          title: '副本 - 一键领取宝箱',
          header: reply.buttons,
          content: Format.createMarkdown().addText(reply.text)
        })
      );
    });

    if (response.handled) {
      return;
    }
    const result = { data: response.data };

    if (result.data.success) {
      resultMd.addText(`🎁 ${result.data.message}`);
      resultMd.addNewline();
      resultMd.addNewline();

      for (const detail of result.data.details) {
        resultMd.addText(`第${detail.chapterNumber}章 ${detail.chapterName}：宝箱×${detail.claimed.length}，灵晶×${detail.reward}`);
        resultMd.addNewline();
      }
    }
    if (!result.data.success) {
      resultMd.addText(result.data.message);
      appendMiddlewareAdvice(
        resultMd,
        withBusinessRecovery('storyline.chests-claim-all', {
          title: '',
          heading: '',
          text: result.data.message,
          buttons: [],
          advice: []
        }).advice
      );
    }
    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '副本 - 一键领取宝箱',
        header: [
          { label: '返回', command: '/查看主线' },
          { label: '秘境', command: '/查看秘境' }
        ],
        content: resultMd
      })
    );
  } catch (_error) {
    logger.error('一键领取宝箱失败:', _error);

    const errMd = Format.createMarkdown();

    errMd.addText('❌ 领取失败，请稍后重试');

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '副本 - 一键领取宝箱',
        header: [{ label: '返回', command: '/查看主线' }],
        content: errMd
      })
    );
  }
});
