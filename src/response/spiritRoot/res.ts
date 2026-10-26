import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, onResponse, useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
import { addOptions, createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import {
  parseSpiritRoot,
  parseSpiritRootMaterials,
  parseSpiritRootMutation,
  parseSpiritRootPreview,
  type SpiritRootSource,
  type SpiritRootView
} from '@src/api/bot/spirit-root';

const MATERIAL_POINTS = [1, 2, 3, 5];
const MATERIAL_PAGE_SIZE = 4;

class SpiritRootInputError extends Error {}

const appendSources = (quote: ReturnType<typeof Format.createMarkdown>, label: string, sources: SpiritRootSource[], names: string[] = []) => {
  if (sources.length === 0) {
    quote.addNewline().addText(`${label}：${names.length ? names.join('、') : '暂无秘境来源'}`);

    return;
  }
  for (const source of sources) {
    const limit = source.realmLimit.includes('配置缺失') ? '境界待确认' : source.realmLimit;

    quote.addNewline().addText(`${label}：${source.name} · ${limit}`);
    quote.addText(' ').addButton(markdownButtonLabel('查看'), { data: `/秘境详情 ${source.name}` });
  }
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const parts = String(e.MessageText ?? '')
    .trim()
    .replace(/^[!！/#＃]\s*/u, '')
    .split(/\s+/u);
  const command = parts[0];
  const footer: GuiButton[] = command === '灵根' || command === '我的灵根' ? [] : [{ label: '返回灵根', command: '/灵根' }];
  let title = '灵根';
  let header: GuiButton[] | undefined;
  let nav: { current: number; total: number; command: string } | undefined;
  const overview = (root: SpiritRootView) => {
    if (!root.granted) {
      md.addText('暂无灵根');

      return;
    }
    const lines = [root.title, `闭关修为 +${root.bonusPercent}%`];

    if (root.stageTarget > 0) {
      lines.push(`培养 ${root.stagePoints}/${root.stageTarget}`);
      const realm = !root.canFeed && !root.canPromote ? `待${root.requiredRealmName}` : root.requiredRealmName;

      lines.push(`晋至${root.nextQualityName}：${realm} · 修为加成 +${root.nextBonusPercent}%`);
    }
    if (root.overflow > 0) {
      lines.push(`晋品后保留培养值 ${root.overflow}`);
    }
    if (root.meditationActive && root.activeMeditationBonusPercent !== root.bonusPercent) {
      lines.push(`本轮修为 +${root.activeMeditationBonusPercent}% · 下轮 +${root.bonusPercent}%`);
    }
    const buttons: { label: string; command: string }[] = [];

    if (root.canFeed) {
      buttons.push({ label: '培养', command: '/灵根材料' });
    }
    if (root.canPromote) {
      buttons.push({ label: `晋至${root.nextQualityName}`, command: `/灵根晋品 ${root.quality} ${root.cultivation}` });
    }
    md.addBlockquote(createQuoteMarkdown(lines, buttons));
  };

  try {
    if (command === '灵根材料' || (command === '灵根培养' && parts.length === 1)) {
      title = '灵根 · 灵药';
      const category = command === '灵根材料' ? Number(parts[1] ?? 1) : 1;
      const page = command === '灵根材料' ? Number(parts[2] ?? 1) : 1;

      header = MATERIAL_POINTS.map(points => ({ label: `${points}点`, selected: points === category, command: `/灵根材料 ${points}` }));
      if (!MATERIAL_POINTS.includes(category) || !Number.isSafeInteger(page) || page < 1) {
        throw new SpiritRootInputError('请选择灵药分类或有效页码');
      }
      const result = await runRobotBusiness(e, 'spirit-root.materials', {}, parseSpiritRootMaterials, next);

      if (result.handled) {
        return;
      }
      const materials = result.data.filter(item => item.points === category);
      const totalPages = Math.max(1, Math.ceil(materials.length / MATERIAL_PAGE_SIZE));
      const currentPage = Math.min(page, totalPages);

      if (materials.length === 0) {
        md.addText('暂无此类灵药');
      }
      for (const herb of materials.slice((currentPage - 1) * MATERIAL_PAGE_SIZE, currentPage * MATERIAL_PAGE_SIZE)) {
        const quote = createQuoteMarkdown([`${herb.name} · 培养 +${herb.points}/份`, `持有 ${herb.quantity}${herb.locked ? ' · 已锁定' : ''}`]);

        appendSources(quote, '来源', herb.sourceDetails, herb.sources);
        if (herb.seedAvailable) {
          quote.addNewline().addText(`种植：${herb.seedName}`);
          appendSources(quote, '种子', herb.seedSources);
        }
        if (herb.quantity > 0 && !herb.locked) {
          quote.addNewline();
          addOptions(
            quote,
            [1, 10, 100]
              .filter(quantity => quantity <= herb.quantity)
              .map(quantity => ({
                label: `投入×${quantity}`,
                command: `/灵根培养 ${herb.itemId} ${quantity}`
              }))
          );
        }
        md.addBlockquote(quote);
      }
      if (totalPages > 1) {
        nav = { current: currentPage, total: totalPages, command: `/灵根材料 ${category} {page}` };
      }
    } else if (command === '灵根培养') {
      title = '灵根 · 培养';
      if (parts.length !== 3) {
        throw new SpiritRootInputError('请选择灵药与数量');
      }
      const quantity = Number(parts[2]);
      const id = Number(parts[1]);

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new SpiritRootInputError('请输入有效的灵药数量');
      }
      const args = Number.isSafeInteger(id) && id > 0 ? { itemId: id, quantity } : { itemName: parts[1], quantity };
      const result = await runRobotBusiness(e, 'spirit-root.preview', args, parseSpiritRootPreview, next);

      if (result.handled) {
        return;
      }
      const p = result.data;
      const lines = [`消耗 ${p.itemName}×${p.consumed}`, `培养 +${p.pointsAdded} · ${p.stageBefore}/${p.stageTarget} → ${p.stageAfter}/${p.stageTarget}`];
      const overflow = Math.max(0, p.stageBefore + p.pointsAdded - p.stageTarget);

      if (p.requested > p.consumed) {
        lines.push(`余下 ${p.requested - p.consumed} 份不消耗`);
      }
      if (overflow > 0) {
        lines.push(`晋品后保留培养值 ${overflow}`);
      }
      md.addBlockquote(
        createQuoteMarkdown(lines, [
          { label: '确认投入', command: `/灵根确认培养 ${p.itemId} ${p.requested} ${p.quality} ${p.before}` },
          { label: '返回灵药', command: '/灵根材料' }
        ])
      );
    } else if (command === '灵根确认培养') {
      title = '灵根 · 培养';
      if (parts.length !== 5) {
        throw new SpiritRootInputError('请重新选择灵药并确认投入');
      }
      const [itemId, quantity, expectedQuality, expectedCultivation] = parts.slice(1).map(Number);

      if (![itemId, quantity, expectedQuality, expectedCultivation].every(Number.isSafeInteger)) {
        throw new SpiritRootInputError('请重新选择灵药并确认投入');
      }
      const result = await runRobotBusiness(e, 'spirit-root.feed', { itemId, quantity, expectedQuality, expectedCultivation }, parseSpiritRootMutation, next);

      if (result.handled) {
        return;
      }
      md.addText(result.data.message).addNewline();
      overview(result.data.view);
    } else if (command === '灵根晋品') {
      title = '灵根 · 晋品';
      if (parts.length !== 3) {
        throw new SpiritRootInputError('请返回灵根查看晋品条件');
      }
      const [expectedQuality, expectedCultivation] = parts.slice(1).map(Number);

      if (![expectedQuality, expectedCultivation].every(Number.isSafeInteger)) {
        throw new SpiritRootInputError('请返回灵根查看晋品条件');
      }
      const result = await runRobotBusiness(e, 'spirit-root.promote', { expectedQuality, expectedCultivation }, parseSpiritRootMutation, next);

      if (result.handled) {
        return;
      }
      md.addText('晋品成功').addNewline();
      overview(result.data.view);
    } else {
      const result = await runRobotBusiness(e, 'spirit-root.query', {}, parseSpiritRoot, next);

      if (result.handled) {
        return;
      }
      overview(result.data);
    }
  } catch (error) {
    md.addText(error instanceof SpiritRootInputError ? error.message : getCommandErrorMessage(error));
  }
  void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title, header, content: md, nav, footer }));
});
