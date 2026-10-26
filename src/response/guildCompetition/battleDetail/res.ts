import { formatGameTime } from '@src/utils/gameTime';
import { BattleFormatGui } from '@src/utils/battleMemoryMessage';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseCompetitionBattleDetail } from '@src/api/bot/competition-read-projections';
import { selects } from '@src/response/config';
import type { GuiButton } from '@src/utils/messageHelper';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const text = (e.MessageText ?? '').trim();
  const cleaned = text.replace(/^(!|！|\/|#|＃)?\s*/, '');
  const match = cleaned.match(/^宗门大比战斗详情\s+(\d+)$/);

  if (!match) {
    return;
  }

  const battleId = Number(match[1]);

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text) }));
  };
  const loaded = await runRobotBusiness(e, 'competition.battle-detail', { battleIdText: String(battleId) }, parseCompetitionBattleDetail, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '获取战斗详情失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const appResult = { data: loaded.data };
  const { stageName, battleTime, attackerName, defenderName, winnerName, isWin, battleLogId } = appResult.data;

  const md = Format.createMarkdown();

  md.addBlockquote(
    Format.createMarkdown()
      .addText(`记录ID：${battleId}`)
      .addNewline()
      .addText(`阶段：${stageName}`)
      .addNewline()
      .addText(`时间：${formatGameTime(battleTime)}`)
      .addNewline()
      .addText(`对阵：${attackerName} VS ${defenderName}`)
      .addNewline()
      .addText(`结果：${isWin ? '✅ 胜利' : '❌ 失败'}（胜者：${winnerName}）`)
  );

  const footer: GuiButton[] = [];

  md.addNewline();

  if (battleLogId) {
    footer.push({ label: '文字记录', command: `/查看战斗过程 ${battleLogId}` });
  }

  footer.push({ label: '返回列表', command: '/宗门大比战斗记录 1' });

  void message.send(
    await BattleFormatGui(
      {
        isPrivate,
        bid,
        title: '宗门大比 - 战斗详情',
        header: [
          { label: '返回', command: '/宗门大比' },
          { label: '战斗记录', command: '/宗门大比战斗记录 1' }
        ],
        content: md,
        footer
      },
      [{ id: battleLogId }]
    )
  );
});
