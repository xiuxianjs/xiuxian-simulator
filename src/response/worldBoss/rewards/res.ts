import { formatNumber } from '@src/utils/formatHelper';
import { useMessage } from '@src/utils/useMessage';
/**
 * 凶兽奖励查看指令
 * 指令：#凶兽奖励
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotWorldBossRewards } from '@src/api/bot/world-boss-robot-query';
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
  const loaded = await runRobotBusiness(e, 'world-boss.rewards', {}, parseRobotWorldBossRewards, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '查询奖励信息失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const md = Format.createMarkdown();

  const { stageName, bossTitle, bossName, baseDamage, tiers, claimableRewardCount } = loaded.data;

  md.addText(`💎 凶兽奖励档位 · ${stageName}`);
  md.addNewline();
  md.addBlockquote(Format.createMarkdown().addText(`凶兽：${bossTitle}·${bossName}`));

  md.addBlockquote(Format.createMarkdown().addText(`基准伤害：${baseDamage}`).addNewline().addText('（基准 = 凶兽总HP ÷ 预期攻击次数）'));

  for (const tier of tiers) {
    md.addText(`${tier.tierName}（${tier.condText}）`);
    md.addNewline();

    const rewards: string[] = [];

    if (tier.spiritStone > 0) {
      rewards.push(`灵石 ×${formatNumber(tier.spiritStone)}`);
    }

    if (tier.spiritCrystal > 0) {
      rewards.push(`灵晶 ×${formatNumber(tier.spiritCrystal)}`);
    }

    md.addText(`  → ${rewards.join('、')}`);
    md.addNewline();
  }

  md.addNewline();
  md.addBlockquote(
    Format.createMarkdown()
      .addText('💡 活动结束后方可领取奖励，奖励 6 天内有效')
      .addNewline()
      .addText(claimableRewardCount > 0 ? `当前有 ${claimableRewardCount} 份奖励可领取` : '当前暂无可领取奖励')
  );

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '凶兽奖励',
      header: [{ label: '返回', command: '/凶兽' }],
      content: md,
      footer: [
        { label: '凶兽信息', command: '/凶兽' },
        { label: '挑战凶兽', command: '/挑战凶兽' },
        { label: '打完剩余', command: '/挑战凶兽 全部' },
        ...(claimableRewardCount > 0 ? [{ label: '领取奖励', command: '/领取凶兽奖励' }] : [])
      ]
    })
  );
});
