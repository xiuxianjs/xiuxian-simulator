import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { recoveryEffectsMarkdown } from '@src/utils/resourceRecoveryDisplay';
/**
 * 本命物信息指令
 * 指令：/本命物信息
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotSoulInfo } from '@src/api/bot/soul-artifact-overview-queries';
import { selects } from '@src/response/config';
import { soulArtifactActions, soulArtifactPageActions, soulArtifactBlockedAdvice } from '@src/response/soulArtifact/capabilities';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;

  const [, parentNext] = useEvent();
  const renderFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-artifacts.info', { ...reply, title: reply.title || '本命物信息' }), 'footer')
  );
  const response = await runRobotBusiness(
    e,
    'soul-artifacts.info',
    {},
    value => {
      const data = parseRobotSoulInfo(value);

      if (data.code === 'EQUIPPED') {
        const artifact = data.data.artifact;

        if (artifact.capabilities.some(capability => capability.instanceId !== artifact.instanceId)) {
          throw new Error('本命物操作目标不匹配');
        }
        soulArtifactActions(artifact.capabilities);
      }

      return data;
    },
    parentNext,
    renderFailure
  ).catch(async error => {
    logger.error('[本命物信息] 查询失败', error);
    await renderFailure({ title: '', heading: '', text: '本命物查询未获完整确认，请先核对本人状态与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const result = response.data;

  if (result.code === 'EMPTY') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    md.addNewline();
    md.addButton(markdownButtonLabel('积分商店'), { data: '/商店 积分' });
    md.addText(' ');
    md.addButton(markdownButtonLabel('珍宝楼'), { data: '/珍宝楼' });

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? e.name.startsWith('private.'),
        bid,
        title: '本命物信息',
        content: md
      })
    );

    return;
  }

  const contentMd = Format.createMarkdown();

  if (result.code === 'EQUIPPED') {
    const equipped = result.data.artifact;
    const maxLevel = result.data.maxLevel;

    contentMd.addText(`当前炼化：${equipped.name}（${equipped.gradeName}）`);
    contentMd.addNewline();
    contentMd.addText(`定位：${equipped.category} · ${equipped.positioning}`);
    contentMd.addNewline();
    contentMd.addText(`品级：${equipped.gradeName}`);
    contentMd.addNewline();
    contentMd.addText(`等级：Lv.${equipped.level} / ${maxLevel}`);
    contentMd.addNewline();
    contentMd.addText(`洗涤：${equipped.washCount}次（${equipped.washQuality}）`);
    contentMd.addNewline();

    if (equipped.recoveryEffects?.length) {
      contentMd.addBlockquote(recoveryEffectsMarkdown(equipped.recoveryEffects));
      contentMd.addNewline();
    }
    // ── 基础面板 ────────────────────────────
    contentMd.addText(equipped.combatPanels ? '当前境界战斗加成' : '基础面板');
    contentMd.addNewline();

    for (const p of equipped.combatPanels ?? equipped.basePanels) {
      contentMd.addBlockquote(Format.createMarkdown().addText(` ${p.name}：${equipped.combatPanels ? '+' : ''}${p.value}`));
    }

    contentMd.addNewline();

    // ── 词条 ────────────────────────────────

    if (equipped.revealedAffixCount < equipped.maxAffixCount) {
      contentMd.addText(`${equipped.combatPanels ? '洗炼记录 · ' : ''}显现词条：${equipped.revealedAffixCount} / ${equipped.maxAffixCount}`);
      contentMd.addNewline();
    } else {
      contentMd.addText(equipped.combatPanels ? '洗炼记录' : '词条');
      contentMd.addNewline();
    }

    for (const p of equipped.panels) {
      const tag = p.affixTypeName;

      if (p.isPercent) {
        contentMd.addBlockquote(Format.createMarkdown().addText(` ${p.name}(${tag})：${+Number(p.washBonus).toFixed(2)}% / ${+Number(p.washCap).toFixed(2)}%`));
      } else {
        contentMd.addBlockquote(Format.createMarkdown().addText(` ${p.name}(${tag})：${p.washBonus} / ${p.washCap}`));
      }

      contentMd.addNewline();
    }

    addOptions(contentMd, soulArtifactActions(equipped.capabilities));
  } else {
    contentMd.addText(result.data.message);
    contentMd.addNewline();
    contentMd.addBlockquote(
      Format.createMarkdown().addText('可在储物袋中选择本命物进行炼化 ').addButton(markdownButtonLabel('储物袋 · 本命'), { data: '/储物袋 本命' })
    );
  }

  appendMiddlewareAdvice(
    contentMd,
    soulArtifactBlockedAdvice([...(result.code === 'EQUIPPED' ? result.data.artifact.capabilities : []), ...result.capabilities])
  );
  await message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? e.name.startsWith('private.'),
      bid,
      title: '本命物信息',
      header: [{ label: '储物袋 · 本命', command: '/储物袋 本命' }],
      content: contentMd,
      footer: [...('capabilities' in result ? soulArtifactPageActions(result.capabilities) : []), { label: '我的主页', command: '/我' }]
    })
  );
});
