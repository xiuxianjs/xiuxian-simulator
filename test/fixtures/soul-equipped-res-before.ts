// Frozen before equipped projection; only import locations adapted for this fixture.
import { useMessage } from '@src/utils/useMessage';
import { recoveryEffectsMarkdown } from '@src/utils/resourceRecoveryDisplay';
/**
 * 本命物信息指令
 * 指令：/本命物信息
 */
import App from './soul-equipped-app-before';
import { selects } from '@src/response/config';
import { soulArtifactActions, soulArtifactPageActions } from '@src/response/soulArtifact/capabilities';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const uid = e.uid as number;

  const result = await App({ bid, uid });

  if (result.code === 'EMPTY') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);
    md.addNewline();
    md.addButton('积分商店', { data: '/商店 积分' });
    md.addText(' ');
    md.addButton('珍宝楼', { data: '/珍宝楼' });

    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
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
    contentMd.addText('基础面板');
    contentMd.addNewline();

    for (const p of equipped.basePanels) {
      contentMd.addBlockquote(Format.createMarkdown().addText(` ${p.name}：${p.value}`));
    }

    contentMd.addNewline();

    // ── 词条 ────────────────────────────────

    if (equipped.revealedAffixCount < equipped.maxAffixCount) {
      contentMd.addText(`显现词条：${equipped.revealedAffixCount} / ${equipped.maxAffixCount}`);
      contentMd.addNewline();
    } else {
      contentMd.addText('词条');
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

    contentMd.addNewline();
    contentMd.addText('说明');
    contentMd.addNewline();
    if (equipped.revealedAffixCount < equipped.maxAffixCount) {
      contentMd.addBlockquote(Format.createMarkdown().addText(' 本命物会随洗涤逐步显现更多词条'));
    }
    contentMd.addBlockquote(
      addOptions(
        Format.createMarkdown().addText(' 洗涤结果为：新增 / 替换 / 升级').addNewline().addText(' 品级每提升1阶，词条数+1'),
        soulArtifactActions(equipped.capabilities)
      )
    );
  } else {
    contentMd.addText(result.code === 'NOT_EQUIPPED' ? result.data.message : result.data.message);
    contentMd.addNewline();
    contentMd.addBlockquote(Format.createMarkdown().addText('可在储物袋中选择本命物进行炼化 ').addButton('储物袋 · 本命', { data: '/储物袋 本命' }));
  }

  void message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: '本命物信息',
      header: [{ label: '储物袋 · 本命', command: '/储物袋 本命' }],
      content: contentMd,
      footer: [...('capabilities' in result ? soulArtifactPageActions(result.capabilities) : []), { label: '我的主页', command: '/我' }]
    })
  );
});
