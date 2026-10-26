import { formatGameDate } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
/**
 * 领取凶兽奖励指令
 * 指令：#领取凶兽奖励
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseWorldBossClaimAll } from '@src/api/bot/world-boss-claim';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);
    await message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  };
  const loaded = await runRobotBusiness(e, 'world-boss.reward-claim', {}, parseWorldBossClaimAll, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '领取奖励失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const md = Format.createMarkdown();

  const { items, totalStone, totalCrystal } = loaded.data;

  md.addText('✅ 凶兽奖励领取成功');
  md.addNewline();
  md.addNewline();

  for (const r of items) {
    md.addText(`${formatGameDate(r.bossDate)} · ${r.stageName} · ${r.tierName}`);
    md.addNewline();

    const rewards: string[] = [];

    if (r.spiritStone > 0) {
      rewards.push(`灵石 ×${r.spiritStone}`);
    }

    if (r.spiritCrystal > 0) {
      rewards.push(`灵晶 ×${r.spiritCrystal}`);
    }

    md.addText(`  → ${rewards.join('、')}`);
    md.addNewline();
  }

  if (items.length > 1) {
    md.addNewline();
    md.addText('【合计】');
    md.addNewline();

    const totals: string[] = [];

    if (totalStone > 0) {
      totals.push(`灵石 ×${totalStone}`);
    }

    if (totalCrystal > 0) {
      totals.push(`灵晶 ×${totalCrystal}`);
    }

    md.addBlockquote(Format.createMarkdown().addText(`${totals.join('、')}`));
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '领取凶兽奖励',
      header: [{ label: '返回', command: '/凶兽' }],
      content: md,
      footer: [{ label: '凶兽信息', command: '/凶兽' }]
    })
  );
});
