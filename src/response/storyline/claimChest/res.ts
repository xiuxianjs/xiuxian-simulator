import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseStorylineChapterChestClaim } from '@src/api/bot/storyline-chest-claim';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

/**
 * 领取宝箱指令
 * /领取宝箱 {章节} {宝箱序号}  → 领取指定宝箱
 * /领取宝箱 {章节}             → 一键领取该章所有可领取宝箱
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, parentNext] = useEvent();

  try {
    const response = await runRobotBusiness(
      e,
      'storyline.chests-claim',
      { input: e.MessageText },
      value => {
        if (value && typeof value === 'object' && 'outcome' in value && value.outcome === 'ignored') {
          return { ignored: true as const };
        }

        return { ignored: false as const, data: parseStorylineChapterChestClaim(value) };
      },
      parentNext,
      async reply => {
        const md = Format.createMarkdown();

        if (reply.blocks?.length) {
          for (const block of reply.blocks) {
            md.addText(block.text);
            if (block.inlineButtons?.length) {
              addOptions(md, block.inlineButtons);
            } else if (block.newline) {
              md.addNewline();
            }
          }
        } else {
          md.addText(reply.text);
        }
        await message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: reply.title, header: reply.buttons, content: md }));
      }
    );

    if (response.handled || response.data.ignored) {
      return;
    }
    const result = { data: response.data.data };
    const chapterNumber = result.data.chapterNumber;

    const resultMd = Format.createMarkdown();

    if (result.data.success) {
      resultMd.addText(`🎁 ${result.data.message}`);

      if (result.data.claimedIndexes.length > 0) {
        resultMd.addNewline();
        resultMd.addNewline();

        for (const idx of result.data.claimedIndexes) {
          resultMd.addText(`✅ 宝箱${idx} 已领取`);
          resultMd.addNewline();
        }
      }
    }

    if (!result.data.success) {
      resultMd.addText(result.data.message);
      appendMiddlewareAdvice(
        resultMd,
        withBusinessRecovery('storyline.chests-claim', {
          title: '',
          heading: '',
          text: result.data.message,
          buttons: [],
          advice: []
        }).advice
      );
    }
    if (result.data.chests.length > 0) {
      resultMd.addNewline();
      resultMd.addText(`第${chapterNumber}章宝箱状态`);
      resultMd.addNewline();

      for (const chest of result.data.chests) {
        if (chest.claimed) {
          resultMd.addText(`🎁(${chest.requiredStars}⭐)：灵晶×${chest.reward} ✅`);
          resultMd.addNewline();
        } else if (chest.unlocked) {
          resultMd.addText(`🎁(${chest.requiredStars}⭐)：灵晶×${chest.reward} 🔓`);

          addOptions(resultMd, [{ label: '领取', command: `/领取宝箱 ${chapterNumber} ${chest.index}` }]);
        } else {
          resultMd.addText(`🎁(${chest.requiredStars}⭐)：灵晶×${chest.reward} 🔒`);
          resultMd.addNewline();
        }
      }
    }

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: `第${chapterNumber}章宝箱`,
        header: [
          { label: '返回', command: `/查看主线 ${chapterNumber}` },
          { label: '副本', command: '/副本列表' }
        ],
        content: resultMd
      })
    );
  } catch (_error) {
    logger.error('领取宝箱失败:', _error);

    const errMd = Format.createMarkdown();

    errMd.addText('❌ 领取宝箱失败，请稍后重试');

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '宝箱',
        header: [{ label: '返回', command: '/副本列表' }],
        content: errMd
      })
    );
  }
});
