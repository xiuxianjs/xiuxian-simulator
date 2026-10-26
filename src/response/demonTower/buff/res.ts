import { useMessage } from '@src/utils/useMessage';
/**
 * 妖塔选buff指令
 * 指令：#妖塔选buff <hp|atk|critDmg|生命|攻击|暴伤> [次数]
 * 支持批量选择，如：妖塔选buff 生命 3
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotDemonTowerBuff, demonTowerBuffArguments } from '@src/api/bot/demon-tower-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import type { GuiButton } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown().addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  };
  const loaded = await runRobotBusiness(e, 'demon-tower.buff', demonTowerBuffArguments(e.MessageText || ''), parseRobotDemonTowerBuff, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '选择 Buff 失败');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const result = loaded.data;

  if (result.outcome === 'usage') {
    const md = Format.createMarkdown();

    md.addText('请指定 buff 类型：妖塔选buff 生命 / 攻击 / 暴伤 [次数]');
    md.addNewline();
    md.addText('支持批量选择，如：妖塔选buff 生命 3');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const d = result.data;
  const lines: string[] = [];

  if (d.count > 1) {
    lines.push(`已批量选择 Buff：${d.buffApplied} ×${d.count}`);
  } else {
    lines.push(`已选择 Buff：${d.buffApplied}`);
  }

  lines.push('');
  lines.push('当前累计 Buff：');

  if (d.newBuffs.hp > 0) {
    lines.push(`  生命 +${d.newBuffs.hp}%`);
  }

  if (d.newBuffs.atk > 0) {
    lines.push(`  攻击 +${d.newBuffs.atk}%`);
  }

  if (d.newBuffs.critDmg > 0) {
    lines.push(`  暴伤 +${d.newBuffs.critDmg}%`);
  }

  lines.push('');

  if (d.remainingBuffSelections > 0) {
    lines.push(`还需选择 ${d.remainingBuffSelections} 次 Buff`);
  } else {
    lines.push('继续挑战下一层吧！');
  }

  const md = Format.createMarkdown();

  md.addBold('【妖塔 Buff】');
  md.addNewline();
  md.addText(lines.join('\n'));

  const footer: GuiButton[] = [];

  if (d.remainingBuffSelections > 0) {
    md.addNewline();

    for (const buff of d.buffOptions) {
      footer.push({ label: `${buff.cnKey}`, command: `/妖塔选buff ${buff.cnKey} 1` });
    }
  } else {
    md.addNewline();
    footer.push({ label: '挑战1🌟', command: '/妖塔挑战 1' });
    footer.push({ label: '挑战2🌟', command: '/妖塔挑战 2' });
    footer.push({ label: '挑战3🌟', command: '/妖塔挑战 3' });
  }

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer }));
});
