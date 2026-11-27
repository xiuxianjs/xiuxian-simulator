import type { SoulArtifactOverviewDisplayItem } from '@src/api/bot/soul-artifact-overview-queries';
import { soulArtifactActions } from '@src/response/soulArtifact/capabilities';
import { addOptions } from '@src/utils/messageHelper';
import { recoveryEffectsMarkdown } from '@src/utils/resourceRecoveryDisplay';
import { Format, type FormatMarkDown } from 'alemonjs';

const upgradeCommand = '/本命物升级';
const washCommand = '/本命物洗涤';

export function appendSoulArtifactOverview(md: FormatMarkDown, artifact: SoulArtifactOverviewDisplayItem) {
  const actions = soulArtifactActions(artifact.capabilities);
  const upgrade = actions.find(action => action.command === upgradeCommand);
  const wash = actions.find(action => action.command === washCommand);

  if (!artifact.isEquipped) {
    md.addText(`状态：${artifact.statusText}`).addNewline();
  }

  md.addText(`定位：${artifact.category} · ${artifact.positioning}`).addNewline();
  md.addText(`等级：${artifact.level}`);
  if (upgrade) {
    addOptions(md, [{ ...upgrade, label: '升级' }], undefined, false);
  }
  md.addNewline();
  md.addText(`洗涤：${artifact.washCount} 次（${artifact.washQuality}）`).addNewline();

  const attributes = Format.createMarkdown().addBold('基础属性').addNewline().addNewline();

  for (const panel of artifact.basePanels) {
    attributes.addText(`${panel.name}：${panel.value > 0 ? '+' : ''}${panel.value}`).addNewline();
  }
  if (!artifact.basePanels.length) {
    attributes.addText('暂无基础属性').addNewline();
  }
  attributes.addNewline().addBold('词条属性');
  if (wash) {
    addOptions(attributes, [{ ...wash, label: '洗涤' }], undefined, false);
  }
  attributes.addNewline().addNewline();

  if (artifact.panels.length) {
    attributes.addText('已洗值 / 上限');
    for (const panel of artifact.panels) {
      const unit = panel.isPercent ? '%' : '';

      attributes.addNewline().addText(`${panel.name}（${panel.affixTypeName}）：${panel.washBonus}${unit} / ${panel.washCap}${unit}`);
    }
  } else {
    attributes.addText('暂无已显现词条');
  }

  md.addBlockquote(attributes).addNewline();

  if (artifact.recoveryEffects?.length) {
    md.addBlockquote(recoveryEffectsMarkdown(artifact.recoveryEffects)).addNewline();
  }

  addOptions(md, [...actions.filter(action => action !== upgrade && action !== wash), { label: '储物袋', command: '/储物袋 本命' }]);
}
