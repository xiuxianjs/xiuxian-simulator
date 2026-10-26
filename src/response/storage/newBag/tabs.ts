import { markdownButtonLabel } from '@src/utils/buttonLabel';
/**
 * 储物袋通用 tab 导航组件
 * 一级分类使用底部按钮（footer），二级子类使用内联 markdown 按钮
 */
import type { GuiButton } from '@src/utils/messageHelper';
import type { FormatMarkDown } from 'alemonjs';

/** 一级分类定义（footer 按钮，2行：3+4） */
const PRIMARY_TABS_ROW1: GuiButton[] = [
  { label: '道具', command: '/储物袋 道具 丹药' },
  { label: '材料', command: '/储物袋 材料 草药' },
  { label: '装备', command: '/储物袋 装备' }
];

const PRIMARY_TABS_ROW2: GuiButton[] = [
  { label: '天工', command: '/储物袋 天工' },
  { label: '功法', command: '/储物袋 功法' },
  { label: '本命', command: '/储物袋 本命' },
  { label: '礼盒', command: '/储物袋 礼盒' }
];

/**
 * 创建一级分类按钮（放在 FormatGui 的 footer 中）
 * 2行布局：第1行3个，第2行4个
 */
export function createPrimaryTabsBar(selected?: string): GuiButton[][] {
  return [
    PRIMARY_TABS_ROW1.map(tab => ({ ...tab, selected: tab.label === selected })),
    PRIMARY_TABS_ROW2.map(tab => ({ ...tab, selected: tab.label === selected })),
    [{ label: '我的主页', command: '/我' }]
  ];
}

/**
 * 将二级子类 tabs 渲染为内联 markdown 按钮
 * @param md FormatMarkDown 对象
 * @param tabs 二级 tab 列表
 */
export function renderSubTabs(md: FormatMarkDown, tabs: Array<{ label: string; command: string }>, selected?: string) {
  for (const tab of tabs) {
    md.addButton(markdownButtonLabel(tab.label, tab.label === selected), { data: tab.command });
    md.addText(' ');
  }
  md.addNewline();
}

/** 道具二级 tabs */
export const PROP_SUB_TABS = [
  { label: '丹药', command: '/储物袋 道具 丹药' },
  { label: '礼物', command: '/储物袋 道具 礼物' },
  { label: '其它', command: '/储物袋 道具 其它' }
];

/** 材料二级 tabs */
export const MATERIAL_SUB_TABS = [
  { label: '草药', command: '/储物袋 材料 草药' },
  { label: '经验材料', command: '/储物袋 材料 经验材料' },
  { label: '其它', command: '/储物袋 材料 其它' }
];

/** 功法二级 tabs */
export const SKILL_SUB_TABS = [
  { label: '全部', command: '/储物袋 功法' },
  { label: '战技', command: '/储物袋 功法 战技' },
  { label: '神通', command: '/储物袋 功法 神通' },
  { label: '被动技', command: '/储物袋 功法 被动技' }
];
