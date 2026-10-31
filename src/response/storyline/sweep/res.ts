import { useMessage } from '@src/utils/useMessage';
/**
 * 主线扫荡指令
 * 指令格式：/主线扫荡 1-1  或  /主线扫荡 1-1 5
 * 次数参数可选，默认 1 次，支持 9999 以内的正整数
 * 三星关卡可扫荡，跳过战斗直接发奖
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseStorylineSweepBusiness } from '@src/api/bot/storyline-sweep';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import type { RobotBusinessFollowup } from '@src/api/bot/robot-business';
import { sendOnboardingFollowup } from '@src/response/onboarding/followup';
import { appendTreasureEffects } from '@src/response/treasureEffects';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, parentNext] = useEvent();
  let data: ReturnType<typeof parseStorylineSweepBusiness>;
  let followup: RobotBusinessFollowup = {};

  try {
    const response = await runRobotBusiness(e, 'storyline.sweep', { input: e.MessageText }, parseStorylineSweepBusiness, parentNext, async reply => {
      await message.send(
        FormatGui({
          isPrivate,
          bid,
          title: reply.title,
          content: Format.createMarkdown().addText(reply.text),
          footer: reply.buttons.length ? reply.buttons : undefined
        })
      );
    });

    if (response.handled) {
      return;
    }
    data = response.data;
    followup = response;
  } catch (error) {
    const text = error instanceof Error ? error.message : '主线扫荡失败';

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '主线扫荡',
        content: Format.createMarkdown().addText(text),
        footer: text.includes('精力不足') ? [{ label: '服用精力丹', command: '/服用 精力丹 3' }] : undefined
      })
    );

    return;
  }
  if (data.ignored) {
    return;
  }
  const { chapterNumber, stageNumber } = data;
  const result = { data: data.result };
  const times = result.data.times;

  // 构建结算展示
  const contentMd = Format.createMarkdown();

  contentMd.addText(`扫荡完成：${result.data.stageLabel} × ${result.data.times}次`);
  contentMd.addNewline();
  contentMd.addNewline();

  contentMd.addText(`消耗精力：${result.data.totalSpiritCost}`);
  contentMd.addNewline();

  const experienceText = result.data.normalExperienceGained === undefined
    ? `${result.data.totalExp}${result.data.expBonusText}` : String(result.data.normalExperienceGained);

  contentMd.addText(`获得修为：+${experienceText}`);
  contentMd.addNewline();
  contentMd.addText(`获得灵石：+${result.data.totalSpiritStone}`);
  contentMd.addNewline();

  if (result.data.allItemsGained.length > 0) {
    contentMd.addNewline();
    contentMd.addText('额外掉落：');
    contentMd.addNewline();

    for (const item of result.data.allItemsGained) {
      contentMd.addBlockquote(
        addOptions(Format.createMarkdown().addText(`${item.name} × ${item.amount} `), [{ label: '详情', command: `/物品详情 道具 ${item.itemId}` }])
      );
    }
  }

  appendTreasureEffects(contentMd, result.data.treasureEffects);
  if (await sendOnboardingFollowup(e, followup, '主线扫荡', contentMd)) {
    return;
  }
  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '主线扫荡',
      header: [
        { label: '返回', command: `/查看主线 ${chapterNumber}` },
        { label: '主线', command: '/查看主线' },
        { label: '秘境', command: '/查看秘境' }
      ],
      content: contentMd,
      footer: [{ label: `继续扫荡×${times}`, command: `/主线扫荡 ${chapterNumber}-${stageNumber} ${times}` }]
    })
  );
});
