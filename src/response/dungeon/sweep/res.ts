import { useMessage } from '@src/utils/useMessage';
/**
 * 秘境扫荡指令
 * 指令格式：/扫荡秘境 秘境名称  或  /扫荡秘境 秘境名称 5  或  /扫荡秘境 秘境名称 10
 * 已成功通关的秘境可扫荡，跳过战斗直接发奖
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { dungeonSweepArguments, parseRobotDungeonSweep, parseRobotDungeonFreeSweep } from '@src/api/bot/dungeon-sweep-robot-query';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { appendTreasureEffects } from '@src/response/treasureEffects';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const raw = (e.MessageText || '').trim();
  const cleaned = raw.replace(/^(!|！|\/|#|＃)?\s*/, '');

  const [, next] = useEvent();
  const free = cleaned === '扫荡免费秘境';
  const sendFailure = async (reply: Pick<RobotMiddlewareReply, 'text' | 'buttons'>) => {
    const md = Format.createMarkdown().addText(reply.text);

    await message.send(
      FormatGui({ isPrivate, bid, title: free ? '秘境免费扫荡' : '秘境扫荡', content: md, footer: reply.buttons.length ? reply.buttons : undefined })
    );
  };

  if (cleaned === '扫荡免费秘境') {
    const loaded = await runRobotBusiness(e, 'dungeon.sweep-free', {}, parseRobotDungeonFreeSweep, next, sendFailure).catch(async error => {
      await sendFailure({
        text: error instanceof Error ? error.message : '服务暂时不可用，请稍后再试',
        buttons: [{ label: '查看秘境', command: '/查看秘境' }]
      });

      return { handled: true as const };
    });

    if (loaded.handled) {
      return;
    }
    const result = { data: loaded.data };

    const md = Format.createMarkdown();

    const experience = result.data.normalExperienceGained ?? result.data.totalExp;

    md.addText(`共结算 ${result.data.sweptDungeons.length} 个秘境 | 免费扫荡 ${result.data.totalTimes} 次 | 修为 +${experience}`);
    md.addNewline();
    md.addNewline();

    for (const item of result.data.sweptDungeons) {
      md.addText(`${item.dungeonName} × ${item.times} | 修为 +${item.totalExp}`);
      md.addNewline();
      if (item.totalCurrencyText) {
        md.addText(item.totalCurrencyText);
        md.addNewline();
      }
      if (item.totalItemsText) {
        md.addNewline();
        md.addText(`掉落：${item.totalItemsText}`);
        md.addNewline();
      }
      md.addNewline();
    }

    if (result.data.skippedDungeons.length > 0) {
      md.addText('未完成的秘境');
      md.addNewline();
      for (const item of result.data.skippedDungeons) {
        const recovery = withBusinessRecovery('dungeon.sweep', { title: '', heading: '', text: item.message, buttons: [], advice: [] });

        md.addBlockquote(
          createQuoteMarkdown(
            [`${item.dungeonName}：${item.message}`, ...recovery.advice.map(tip => tip.description)],
            recovery.advice.map(tip => ({ label: tip.command, command: tip.command }))
          )
        ).addNewline();
      }
    }

    appendTreasureEffects(md, result.data.treasureEffects);
    const footer = [
      { label: '查看秘境', command: '/查看秘境' },
      ...(result.data.skippedDungeons.length ? [] : [{ label: '再次结算', command: '/扫荡免费秘境' }])
    ];

    void message.send(FormatGui({ isPrivate, bid, title: '秘境免费扫荡', content: md, footer }));

    return;
  }

  const sweepArgs = dungeonSweepArguments(e.MessageText || '');
  const loaded = await runRobotBusiness(e, 'dungeon.sweep', sweepArgs, parseRobotDungeonSweep, next, sendFailure).catch(async error => {
    await sendFailure({ text: error instanceof Error ? error.message : '服务暂时不可用，请稍后再试', buttons: [] });

    return { handled: true as const };
  });

  if (loaded.handled || loaded.data.outcome === 'no_match') {
    return;
  }
  const d = loaded.data.data;
  const partial = typeof sweepArgs.times === 'number' && d.times < sweepArgs.times;

  // 构建结算展示
  const contentMd = Format.createMarkdown();

  contentMd.addText(`${d.dungeonName} × ${d.times} | 精力 -${d.totalSpiritCost} | 修为 +${d.totalExp}`);
  contentMd.addNewline();

  if (d.totalCurrencyText) {
    contentMd.addText(d.totalCurrencyText);
    contentMd.addNewline();
  }

  if (d.totalItemsText) {
    contentMd.addText('掉落：');
    contentMd.addText(d.totalItemsText);
    contentMd.addNewline();
  }

  appendTreasureEffects(contentMd, d.treasureEffects);
  contentMd.addNewline();
  contentMd.addNewline();
  if (partial) {
    contentMd.addText(`本次实际完成 ${d.times}/${sweepArgs.times} 次，以上为已结算的实际消耗与奖励。`);
    appendMiddlewareAdvice(
      contentMd,
      withBusinessRecovery('dungeon.sweep', {
        title: '',
        heading: '',
        text: '本次扫荡未完成全部请求次数',
        buttons: [],
        advice: []
      }).advice
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '秘境扫荡',
      header: [
        { label: '返回', command: '/查看秘境' },
        { label: '副本', command: '/查看主线' }
      ],
      content: contentMd,
      footer: [...(!partial ? [{ label: '继续扫荡', command: `/扫荡秘境 ${d.dungeonName} ${d.times}` }] : []), { label: '秘境列表', command: '/查看秘境' }]
    })
  );
});
