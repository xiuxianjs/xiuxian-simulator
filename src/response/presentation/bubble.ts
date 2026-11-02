import { BUBBLE_LIMITS, STATUS_SYMBOL, type BubbleStatus } from './tokens';
import { section, type BubbleAction, type BubbleSection } from './sections';
import { FormatGui, type GuiButton, type GuiFooter } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

/** FormatGui 的导航入参类型（messageHelper 未导出 GuiNav）。 */
export type GuiNav = NonNullable<Parameters<typeof FormatGui>[0]['nav']>;

export type GuiKeyboard = GuiFooter;

export type BubbleInput = {
  isPrivate?: boolean;
  bid?: string;
  mention?: boolean;
  /** 标题必填，格式为 `主题` 或 `主题 · 名称`。 */
  title: string;
  status?: BubbleStatus;
  header?: BubbleAction[];
  sections: BubbleSection[];
  nav?: GuiNav;
  footer?: GuiFooter;
  keyboard?: GuiKeyboard;
  bar?: BubbleAction[] | false;
};

export type BubbleIssue = {
  code:
    | 'EMPTY_TITLE'
    | 'TOO_MANY_HEADER_BUTTONS'
    | 'TOO_MANY_SECTION_BUTTONS'
    | 'TOO_MANY_FOOTER_ROWS'
    | 'TOO_MANY_FOOTER_BUTTONS'
    | 'TOO_MANY_BUTTONS'
    | 'COMMAND_TOO_LONG';
  message: string;
};

const commandCharacters = (command: string): number => [...command].length;

/** 页脚按钮拍平为二维数组，便于统一检查行宽与总数。 */
const footerRows = (footer?: GuiFooter): GuiButton[][] => {
  if (!footer || !Array.isArray(footer) || footer.length === 0) {
    return [];
  }

  return Array.isArray(footer[0]) ? (footer as GuiButton[][]) : [footer as GuiButton[]];
};

/** 收集一条气泡内全部按钮（不含原生键盘）。 */
const collectActions = (input: BubbleInput): Array<{ label: string; command: string }> => [...(input.header ?? []), ...input.sections.flatMap(item => item.actions ?? []), ...footerRows(input.footer).flat()].flatMap(action => typeof action.command === 'string' ? [{ label: action.label, command: action.command }] : []
  );

/**
 * 校验气泡是否符合统一规范；返回空数组表示通过。
 * 运行时不强制抛错，供测试与批次验收使用。
 */
export const bubbleIssues = (input: BubbleInput, limit: number = BUBBLE_LIMITS.totalButtons): BubbleIssue[] => {
  const issues: BubbleIssue[] = [];
  const actions = collectActions(input);

  if (!input.title.trim()) {
    issues.push({ code: 'EMPTY_TITLE', message: '气泡标题不能为空' });
  }
  if ((input.header?.length ?? 0) > BUBBLE_LIMITS.headerButtons) {
    issues.push({ code: 'TOO_MANY_HEADER_BUTTONS', message: `头部按钮不能超过 ${BUBBLE_LIMITS.headerButtons} 个` });
  }
  input.sections.forEach(item => {
    if ((item.actions?.length ?? 0) > BUBBLE_LIMITS.sectionButtons) {
      issues.push({ code: 'TOO_MANY_SECTION_BUTTONS', message: `引用块按钮不能超过 ${BUBBLE_LIMITS.sectionButtons} 个：${item.title ?? '(无标题)'}` });
    }
  });
  const rows = footerRows(input.footer);

  if (rows.length > BUBBLE_LIMITS.footerRows) {
    issues.push({ code: 'TOO_MANY_FOOTER_ROWS', message: `页脚不能超过 ${BUBBLE_LIMITS.footerRows} 行` });
  }
  rows.forEach(row => {
    if (row.length > BUBBLE_LIMITS.footerButtonsPerRow) {
      issues.push({ code: 'TOO_MANY_FOOTER_BUTTONS', message: `页脚每行不能超过 ${BUBBLE_LIMITS.footerButtonsPerRow} 个按钮` });
    }
  });
  if (actions.length > limit) {
    issues.push({ code: 'TOO_MANY_BUTTONS', message: `按钮总数 ${actions.length} 超过上限 ${limit}` });
  }
  actions.forEach(action => {
    if (commandCharacters(action.command) > BUBBLE_LIMITS.commandCharacters) {
      issues.push({ code: 'COMMAND_TOO_LONG', message: `命令超过 ${BUBBLE_LIMITS.commandCharacters} 字符：${action.command}` });
    }
  });

  return issues;
};

/**
 * 统一气泡出口。
 *
 * 内部委托现有 FormatGui，因此出场过滤（featureVisibility）、
 * 按钮间距压缩与按钮文案格式保持不变；未迁移页面不受影响。
 */
export const buildBubble = (input: BubbleInput) => {
  const md = Format.createMarkdown();
  const symbol = input.status && input.status !== 'none' ? ` ${STATUS_SYMBOL[input.status]}` : '';

  input.sections.forEach((item, index) => {
    if (index > 0) {
      md.addNewline();
    }
    md.addBlockquote(section(item));
  });

  return FormatGui({
    isPrivate: input.isPrivate,
    bid: input.bid,
    mention: input.mention,
    title: `${input.title}${symbol}`,
    header: input.header,
    content: md,
    nav: input.nav,
    footer: input.footer,
    keyboard: input.keyboard,
    bar: input.bar
  });
};

export type { GuiButton, GuiFooter };
