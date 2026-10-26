import { isPrivateEvent } from '@src/utils/privateEvent';
import { parsePKReceipt } from '@src/api/bot/pk-receipt';
import { formatGameTime } from '@src/utils/gameTime';
import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
/**
 * 打劫
 * 指令：/打劫 UID 或 /打劫 @目标
 *
 * 消耗：以服务端按境界计算的实际元力回执为准
 * 次数、奖励与暂存状态以服务端结算回执为准
 * 失败：无奖励
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { parseBackendRobbery } from '@src/api/bot/robbery';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = isPrivateEvent(e);

  const [, next] = useEvent();
  const sendFailure = async (reply: Pick<RobotMiddlewareReply, 'title' | 'text' | 'buttons'>) => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: reply.title,
        content: Format.createMarkdown().addText(reply.text),
        footer: reply.buttons.length ? reply.buttons : undefined
      })
    );
  };

  try {
    const target = await resolveRobotTarget(e.MessageText, mention);
    let response;

    try {
      response = await runRobotBusiness(e, 'pvp.robbery', { target }, parseBackendRobbery, next, sendFailure);
    } catch (error) {
      await sendFailure({ title: '', text: error instanceof Error ? error.message : '打劫失败，请稍后再试', buttons: [] });

      return;
    }

    if (response.handled) {
      return;
    }
    const result = response.data;
    const pk = parsePKReceipt(result);
    const won = pk?.won ?? result.winner === 'A';
    // 战斗完成，展示结果
    const md = Format.createMarkdown();
    const br = result.battleView;
    const sideACount = br.finalState.sideA.length;
    const sideBCount = br.finalState.sideB.length;

    md.addBlockquote(
      createQuoteMarkdown([
        `${result.targetName} · ${won ? '打劫成功' : '打劫失败'}`,
        `${sideACount}v${sideBCount} · ${br.totalRounds}回合`,
        `元力 -${result.qiCost} · 今日剩余${result.remaining}/${result.dailyMax}次`
      ])
    );
    const rewards: string[] = [];
    const possessions: string[] = [];

    if (won) {
      const loot: string[] = [];

      if (result.stoneReward) {
        loot.push(`灵石+${result.stoneReward}`);
      }
      if (result.crystalReward) {
        loot.push(`灵晶+${result.crystalReward}`);
      }
      rewards.push(loot.length ? loot.join(' · ') : '未获得货币');
      rewards.push(`煞气 +${result.shaQiChange}（当前${result.currentShaQi}）`);
      if (result.bonusText) {
        rewards.push(result.bonusText);
      }
      if (result.droppedItem) {
        possessions.push(
          pk
            ? `暂存：${result.droppedItem.name}×${result.droppedItem.quantity}（尚未到手）`
            : `掉落：${result.droppedItem.name}×${result.droppedItem.quantity}（${result.droppedItem.category}）`
        );
      }
    }
    if (result.experience && result.experience > 0) {
      rewards.push(`修为 +${result.experience}`);
    }
    if (rewards.length) {
      md.addNewline().addBlockquote(createQuoteMarkdown(rewards));
    }
    if (pk) {
      possessions.push(`对方反击截止：${formatGameTime(pk.counterDeadline)}`);
    }
    if (possessions.length) {
      md.addNewline().addBlockquote(createQuoteMarkdown(possessions));
    }
    if (result.losingStreakText) {
      md.addNewline().addText(result.losingStreakText);
    }

    // 底部按钮
    md.addNewline();

    await message.send(
      await BattleFormatGui(
        {
          isPrivate,
          bid,
          title: '打劫',
          content: md,
          footer: [
            {
              label: '文字记录',
              command: pk && Number.isSafeInteger(result.logId) && result.logId > 0 ? `/争夺回放 ${result.logId} 原战 1` : `/查看战斗过程 ${result.battleLogId}`
            },
            ...(pk && Number.isSafeInteger(result.logId) && result.logId > 0 ? [{ label: '原战报', command: `/争夺战报 ${result.logId}` }] : []),
            { label: '打劫记录', command: '/打劫记录' }
          ]
        },
        [{ id: result.battleLogId }]
      )
    );

    // ── 群播报（纯MD，不@用户，不带按钮）──
    if (!isPrivate && won) {
      const broadcastMd = Format.createMarkdown();
      const lootParts: string[] = [];

      if (result.stoneReward) {
        lootParts.push(`灵石×${result.stoneReward}`);
      }
      if (result.crystalReward) {
        lootParts.push(`灵晶×${result.crystalReward}`);
      }
      if (result.droppedItem && !pk) {
        lootParts.push(`${result.droppedItem.name}×${result.droppedItem.quantity}`);
      }
      const lootText = lootParts.length > 0 ? lootParts.join('、') : '一无所获';

      broadcastMd.addText(
        pk
          ? `⚔️ ${result.attackerName} 打劫了 ${result.targetName}，${lootParts.length ? lootText : '未获得货币'}${result.droppedItem ? '，物品暂存待结算' : ''}。`
          : `⚔️ ${result.attackerName} 打劫了 ${result.targetName}，掠夺了${lootText}！`
      );
      await message.send({
        format: (() => {
          const f = Format.create();

          f.addMarkdown(broadcastMd);

          return f;
        })()
      });
    }
  } catch {
    const md = Format.createMarkdown();

    md.addText('打劫结果暂未确认，请查看打劫记录。');

    await message.send(FormatGui({ isPrivate, bid, title: '打劫', content: md, footer: [{ label: '打劫记录', command: '/打劫记录' }] }));
  }
});
