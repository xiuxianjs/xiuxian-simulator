import { treasureAttributeNames, type OwnedTreasure, type TreasureOverview } from '@src/api/bot/treasures';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { createQuoteMarkdown } from '@src/utils/messageHelper';
import { Format, type FormatMarkDown } from 'alemonjs';

const rarityNames = ['普通', '优秀', '精良', '稀有', '史诗', '神话'];
const pageSize = 6;
const number = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
const gradeName = (value: string) => value.replace(/阶$/, '');

type PageButton = { label: string; command: string; selected?: boolean };

function addButtons(content: FormatMarkDown, buttons: PageButton[]) {
  for (const [index, button] of buttons.entries()) {
    if (index > 0) {
      content.addText(' ');
    }
    content.addButton(markdownButtonLabel(button.label, button.selected), { data: button.command, autoEnter: false });
  }
  content.addNewline();
}

function addNavigation(content: FormatMarkDown, selected: 'owned' | 'effects') {
  addButtons(content, [
    { label: '我的宝物', command: '/宝物', selected: selected === 'owned' },
    { label: '鸿蒙气运', command: '/宝物 气运' },
    { label: '效果总览', command: '/宝物 效果', selected: selected === 'effects' },
    { label: '操作记录', command: '/宝物 记录' }
  ]);
}

function addCultivation(content: FormatMarkDown) {
  content.addBlockquote(
    createQuoteMarkdown([], [
      { label: '一键突破', command: '/宝物 一键突破', autoEnter: false },
      { label: '一键升级', command: '/宝物 一键升级', autoEnter: false }
    ])
  );
}

export function buildOwnedTreasurePage(data: TreasureOverview, options: { rarity?: number; page?: number } = {}): FormatMarkDown {
  const content = Format.createMarkdown();

  addNavigation(content, 'owned');
  content.addBlockquote(createQuoteMarkdown([`宝物经验 ${data.experience} · 仙蕴 ${data.xianYun} · 境界等级上限 ${data.levelCap}`]));
  const owned = data.items.filter(item => item.owned).sort((a, b) => a.definition.id - b.definition.id);
  const availableRarities = [...new Set(owned.map(item => item.definition.rarity))].sort((a, b) => a - b);
  const selectedRarity = options.rarity ?? availableRarities[0] ?? 1;

  if (availableRarities.length) {
    addButtons(
      content,
      availableRarities.map(rarity => ({ label: rarityNames[rarity - 1], command: `/宝物 品质 ${rarity}`, selected: rarity === selectedRarity }))
    );
  }
  const items = owned.filter(item => item.definition.rarity === selectedRarity);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(options.page) ? (options.page as number) : 1));

  if (!items.length) {
    content.addBlockquote(createQuoteMarkdown([owned.length ? `尚未拥有${rarityNames[selectedRarity - 1] ?? '该品质'}宝物。` : '尚未拥有宝物，前往上古遗珍探索后可在此培养。']));
    if (owned.length) {
      addCultivation(content);
    }

    return content;
  }
  for (const item of items.slice((page - 1) * pageSize, page * pageSize)) {
    content.addBlockquote(
      createQuoteMarkdown([item.definition.name, `${gradeName(item.gradeName)} · Lv.${item.level}`], [
        { label: '详情与培养', command: `/宝物 详情 ${item.definition.id}`, autoEnter: false }
      ])
    );
  }
  if (pages > 1) {
    content.addBlockquote(
      createQuoteMarkdown(
        [`第 ${page}/${pages} 页`],
        [
          ...(page > 1 ? [{ label: '上一页', command: `/宝物 品质 ${selectedRarity} p${page - 1}`, autoEnter: false }] : []),
          ...(page < pages ? [{ label: '下一页', command: `/宝物 品质 ${selectedRarity} p${page + 1}`, autoEnter: false }] : [])
        ]
      )
    );
  }
  addCultivation(content);

  return content;
}

export function buildTreasureFortunePage(data: TreasureOverview): FormatMarkDown {
  const content = Format.createMarkdown();
  const f = data.fortune;

  addButtons(content, [
    { label: '宝物总览', command: '/宝物' },
    { label: '鸿蒙气运', command: '/宝物 气运', selected: true }
  ]);
  content.addText('根据宝物培养程度，气运会逐渐累积').addNewline();
  content.addBlockquote(
    createQuoteMarkdown([
      `鸿蒙气运 ${f.level}/${f.maxLevel}级 · 积分 ${number(f.score)}`,
      f.nextThreshold === null
        ? '已达最高气运等级，积分继续保留'
        : `下级累计 ${number(f.nextThreshold)} 分 · 还差 ${number(Math.max(0, f.nextThreshold - f.score))} 分`
    ])
  );
  content.addBlockquote(
    createQuoteMarkdown([
      '当前效果：',
      `命中率 +${number(f.bonus.hitRate)}% · 闪避率 +${number(f.bonus.dodgeRate)}%`,
      `暴击率 +${number(f.bonus.critRate)}% · 暴伤 +${number(f.bonus.critDamage)}%`
    ])
  );

  return content;
}

export function buildTreasureEffectsPage(data: TreasureOverview): FormatMarkDown {
  const content = Format.createMarkdown();
  const owned = data.items.filter(item => item.owned);
  const stats: string[] = [];

  addNavigation(content, 'effects');
  for (const key of Object.keys(treasureAttributeNames) as Array<keyof typeof treasureAttributeNames>) {
    const fixed = owned.reduce((total, item) => total + item.attributes[key], 0);
    const percent = owned.reduce((total, item) => total + item.percentAttributes[key], 0);

    if (fixed) {
      stats.push(`${treasureAttributeNames[key]} +${number(fixed)}`);
    }
    if (percent) {
      stats.push(`${treasureAttributeNames[key]} +${number(percent)}%`);
    }
  }
  content.addBlockquote(createQuoteMarkdown(['宝物战斗属性', ...(stats.length ? stats : ['暂无已激活宝物属性。'])]));
  const effects = owned.filter(item => item.definition.effectDescription && item.currentEffect);

  if (effects.length) {
    for (const item of effects) {
      content.addBlockquote(createQuoteMarkdown([item.definition.name, item.currentEffect]));
    }
  } else {
    content.addBlockquote(createQuoteMarkdown(['暂无已激活宝物生活效果。']));
  }
  content.addBlockquote(createQuoteMarkdown(['鸿蒙气运额外效果单独查看。'], [{ label: '鸿蒙气运', command: '/宝物 气运', autoEnter: false }]));

  return content;
}

function battleAttributes(item: Pick<OwnedTreasure, 'attributes' | 'percentAttributes'>): string[] {
  const values: string[] = [];

  for (const key of Object.keys(treasureAttributeNames) as Array<keyof typeof treasureAttributeNames>) {
    if (item.attributes[key]) {
      values.push(`${treasureAttributeNames[key]} +${number(item.attributes[key])}`);
    }
    if (item.percentAttributes[key]) {
      values.push(`${treasureAttributeNames[key]} +${number(item.percentAttributes[key])}%`);
    }
  }

  return values;
}

function battleChanges(item: OwnedTreasure, next: Pick<OwnedTreasure, 'attributes' | 'percentAttributes'>): string[] {
  const changes: string[] = [];

  for (const key of Object.keys(treasureAttributeNames) as Array<keyof typeof treasureAttributeNames>) {
    const label = treasureAttributeNames[key];

    if (item.attributes[key] !== next.attributes[key]) {
      changes.push(`${label} +${number(item.attributes[key])} → ${label} +${number(next.attributes[key])}`);
    }
    if (item.percentAttributes[key] !== next.percentAttributes[key]) {
      changes.push(`${label} +${number(item.percentAttributes[key])}% → ${label} +${number(next.percentAttributes[key])}%`);
    }
  }

  return changes.length ? changes : ['战斗属性不变'];
}

function specialAttribute(item: OwnedTreasure): string {
  if (!item.currentEffect) {
    return '暂无特殊属性。';
  }
  const effect = /^[^\p{Script=Han}]+$/u.test(item.currentEffect) && item.definition.effectDescription
    ? `${item.definition.effectDescription}（${item.currentEffect}）`
    : item.currentEffect;
  const probability = /^(.*)（(\d+(?:\.\d+)?)%）$/.exec(effect);

  if (probability && probability[1].includes('命中') && !probability[1].includes('修为')) {
    return probability[1].replace(/命中概率|命中/, `${probability[2]}%概率`);
  }

  return effect;
}

export function buildTreasureDetailPage(item: OwnedTreasure, data: TreasureOverview): FormatMarkDown {
  const content = Format.createMarkdown();
  const d = item.definition;

  content.addBlockquote(createQuoteMarkdown([`当前拥有：经验 ${data.experience} · 仙蕴 ${data.xianYun}`]));
  content.addBlockquote(
    createQuoteMarkdown([
      `【${d.rarityName}】${d.name}`,
      item.owned ? `${gradeName(item.gradeName)} · 等级 ${item.level}/${data.levelCap}` : '尚未拥有',
      `碎片 ${item.fragments}/10 · 多余本体 ${item.duplicates}`
    ])
  );
  if (!item.owned) {
    return content;
  }
  const stats = battleAttributes(item);

  content.addBlockquote(createQuoteMarkdown(['战斗属性', ...(stats.length ? stats : ['暂无战斗属性。'])]));
  content.addBlockquote(createQuoteMarkdown(['特殊属性', specialAttribute(item)]));
  if (item.promotionPreview && item.promotion) {
    const block = Format.createMarkdown().addText(`升品至 ${gradeName(item.promotionPreview.gradeName)} `);

    addButtons(block, [{ label: '升品', command: `/宝物 升品 ${d.id}` }]);
    for (const change of battleChanges(item, item.promotionPreview)) {
      block.addText(change).addNewline();
    }
    block.addText(`需要本体 ${item.promotion.duplicates} · 仙蕴 ${item.promotion.xianYun}`);
    for (const requirement of item.promotion.requirements) {
      block.addNewline().addText(requirement);
    }
    content.addBlockquote(block);
  } else {
    content.addBlockquote(createQuoteMarkdown([item.grade >= d.maxGrade ? '品级已达上限。' : '升品：刷新后查看下一阶属性。']));
  }
  if (item.upgradePreview) {
    const block = Format.createMarkdown().addText(`升级至 Lv.${item.upgradePreview.level} `);

    addButtons(block, [{ label: '升级', command: `/宝物 升级 ${d.id}` }]);
    for (const change of battleChanges(item, item.upgradePreview)) {
      block.addText(change).addNewline();
    }
    block.addText(`需要经验 ${item.nextLevelCost}`);
    content.addBlockquote(block);
  } else {
    content.addBlockquote(createQuoteMarkdown([item.level >= data.levelCap ? '等级已达当前境界上限。' : '升级：刷新后查看下一阶属性。']));
  }

  return content;
}
