import { sendBattleResult } from '@src/utils/battleMemoryMessage';
import { appendTreasureEffects } from '@src/response/treasureEffects';
import { useMessage } from '@src/utils/useMessage';
/**
 * 一键挑战 — 通天塔自动挑战5次
 * 指令：/一键挑战
 *
 * 自动选择可挑战范围内排名最高的对手，连续挑战5次。
 * 每次都切实执行战斗，根据胜负发放修为(+30)和声望奖励。
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotTowerBatch } from '@src/api/bot/ranking-robot-query';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let result: ReturnType<typeof parseRobotTowerBatch>;

  try {
    const loaded = await runRobotBusiness(e, 'ranking.batch-challenge', {}, parseRobotTowerBatch, next, async reply => {
      await message.send(
        FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text), footer: reply.buttons.length ? reply.buttons : undefined })
      );
    });

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    void message.send(
      FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '连续爬塔失败，请稍后再试') })
    );

    return;
  }
  const md = Format.createMarkdown();
  const data = result.data;
  const experienceText = data.normalExperienceGained === undefined
    ? `${data.experienceGained}${data.experienceBonusText}` : String(data.normalExperienceGained);

  md.addBold('通天塔 · 连续爬塔');
  md.addNewline();
  md.addNewline();
  for (const event of data.events) {
    md.addText(event.displayText);
    const btns: { label: string; command: string }[] = [];

    if (event.logId) {
      btns.push({ label: '文字记录', command: `/查看战斗过程 ${event.logId}` });
    }
    if (event.needPotion) {
      btns.push({ label: '服用元力丹', command: '/服用 元力丹 3' });
    }

    addOptions(md, btns);
  }

  md.addNewline();
  md.addText('━━ 战斗汇总 ━━');
  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(`战绩：${data.winCount}胜 ${data.lossCount}负`));

  if (data.startRank !== data.finalRank) {
    md.addBlockquote(Format.createMarkdown().addText(`排名：第${data.startRank}名 → 第${data.finalRank}名`));
  } else {
    md.addBlockquote(Format.createMarkdown().addText(`排名：第${data.finalRank}名（不变）`));
  }

  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(`获得修为：+${experienceText}  声望：+${data.reputationGained}`));
  appendTreasureEffects(md, data.treasureEffects);
  await sendBattleResult(
    message,
    {
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [
        { label: '连续爬', command: '/连续爬塔' },
        { label: '通天塔', command: '/通天塔' },
        { label: '首通奖', command: '/首通排名奖励' }
      ]
    },
    data.events.filter(event => event.logId).map(event => ({ id: event.logId, label: `查看战斗回忆${event.index}` }))
  );
});
