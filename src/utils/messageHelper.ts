import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { compactButtonSpacing } from './compactButtonSpacing';
import { isPrivateEvent } from './privateEvent';
/** 消息发送辅助工具：统一处理文本、分页和按钮。 */
import { Format, FormatMarkDown, getCurrentEvent, type DataEnums } from 'alemonjs';

/**
 * 仅限qq-bot使用
 * @param md
 * @param buttons
 */
export const addOptions = (
  md: FormatMarkDown,
  buttons: {
    label: string;
    command: string;
    autoEnter?: boolean;
  }[]
) => {
  for (const btn of buttons) {
    md.addText(' ');
    md.addButton(markdownButtonLabel(`${btn.label}`), { data: btn.command, ...(btn.autoEnter === undefined ? {} : { autoEnter: btn.autoEnter }) });
  }
  md.addNewline();

  return md;
};

/**
 * 创建完整引用块的内部 Markdown。
 * 同一对象的多行信息与局部操作必须写入该对象的同一个引用块。
 */
export const createQuoteMarkdown = (
  lines: string[],
  buttons: {
    label: string;
    command: string;
    autoEnter?: boolean;
  }[] = []
): FormatMarkDown => {
  const quoteMd = Format.createMarkdown();

  lines.forEach((line, index) => {
    if (index > 0) {
      quoteMd.addNewline();
    }
    quoteMd.addText(line);
  });

  if (buttons.length > 0) {
    addOptions(quoteMd, buttons);
  }

  return quoteMd;
};

/**
 * 创建进度
 * @param params
 * @returns
 */
export const createProgress = (params: {
  currentIndex: number;
  meridians: {
    name: string;
    progress: number;
    requiredProgress: number;
  }[];
}) => {
  const { currentIndex, meridians } = params;
  const current = meridians[currentIndex];
  const progressRatio = current.requiredProgress > 0 ? current.progress / current.requiredProgress : 0;
  const progressBar = Math.max(0, Math.min(10, Math.floor(progressRatio * 10))); // 20 → 10
  const bar = '▓'.repeat(progressBar) + '░'.repeat(10 - progressBar); // 20 → 10
  const percent = Math.max(0, Math.min(100, Math.floor(progressRatio * 100)));

  return `${bar} ${percent}%`;
};

// ─── Gui 页面构建器 ─────────────────────────────────────────

/**
 * Input 按钮配置项
 */
export interface GuiButton {
  /** 按钮显示文本 */
  label: string;
  /** 仅用于同一视图组的当前 tab，由页面显式指定。 */
  selected?: boolean;
  /** 点击触发的命令 */
  command?: string;
  type?: 'link' | 'command';
  autoEnter?: boolean;
}

/**
 * Footer 支持两种写法：
 * - `GuiButton[]`：单行按钮（兼容旧用法）。
 * - `GuiButton[][]`：每个子数组一行，可用来表达多行 / 分组按钮。
 */
export type GuiFooter = GuiButton[] | GuiButton[][];

const isFooterRows = (footer: GuiFooter): footer is GuiButton[][] => {
  return Array.isArray(footer) && footer.length > 0 && Array.isArray(footer[0]);
};

export const normalizeFooterRows = (footer: GuiFooter): GuiButton[][] => {
  if (isFooterRows(footer)) {
    return footer.filter(row => row && row.length > 0);
  }

  return footer.length > 0 ? [footer] : [];
};

/**
 * 分页信息配置
 */
interface GuiNav {
  autoEnter?: boolean;
  /** 当前页码 */
  current: number;
  /** 总页数；游标式查询没有总数时不填，不推算未知总页数。 */
  total?: number;
  /** 未返回总页数时，由查询结果判断是否有下一页。 */
  hasNext?: boolean;
  /** 总条目数（可选，显示「共 N 条」） */
  count?: number;
  /** 翻页命令模板，{page} 会被替换为页码，如 '/查看秘境 {page}' */
  command: string;
}

/**
 * qq-bot 风格说明
┌─────────────────────────────────┐
│ 宗门成员列表                      │
│ 【1】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 【2】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 【3】张三 -筑基期 [查看][踢出]     │
│  >贡献:1234    │
│ 第1/3页，共12条 [上一页] [下一页] │
├─────────────────────────────────┤
│ [1][2][3][4][5][6]              │ footer，某bar主题下的其他功能
├─────────────────────────────────┤
│ [我][战][本][动][店][包]          │ bar 每个消息固定的操作。
└─────────────────────────────────┘
 */

/**
 * 新Format构建器gui
 * 语意和阅读行更好
 * 能使用 md.addButton 来添加按钮，按钮和文本可以混排
 * @param params
 * @returns
 */
export const FormatGui = (params: {
  isPrivate?: boolean;
  bid?: string | undefined;
  mention?: boolean;
  title?: string;
  header?: GuiButton[];
  content?: FormatMarkDown | DataEnums[];
  nav?: GuiNav;
  footer?: GuiFooter;
  /** 独立按钮行，显示在底部导航上方。 */
  keyboard?: GuiFooter;
  bar?: GuiButton[] | false;
}) => {
  const format = Format.create();
  const { isPrivate, bid, mention = true, title, header, content, nav, footer, keyboard, bar } = params;
  let md = Format.createMarkdown();

  // Task renderers may carry a legacy presentation snapshot. The actual
  // private transport must never receive a group-only user mention.
  if (!isPrivate && !isPrivateEvent(getCurrentEvent()) && bid && mention) {
    md.addMention(bid);
    md.addNewline();
  }
  if (title) {
    md.addBold(title);
    md.addNewline();
  }
  if (header && header.length > 0) {
    md.addNewline();
    header.forEach((btn, index) => {
      if (index > 0) {
        md.addText(' ');
      }
      if (!btn.command) {
        md.addText(btn.selected ? markdownButtonLabel(btn.label, true) : btn.label);
      } else {
        md.addButton(markdownButtonLabel(btn.label, btn.selected), { data: btn.command, ...(btn.autoEnter === undefined ? {} : { autoEnter: btn.autoEnter }) });
      }
    });
    md.addNewline();
  }
  if (Array.isArray(content)) {
    // 原始消息块保留类型及顺序，图片等内容不转换为 Markdown。
    if (md.value.value.length > 0) {
      format.addMarkdown(md);
    }
    format.value.push(...content);
    md = Format.createMarkdown();
  } else if (content) {
    // 吸收外部传入的 Markdown 对象内容
    md.absorb(content);
  }
  // nav
  if (nav) {
    md.addNewline();
    const countText = nav.count !== undefined ? `，共${nav.count}条` : '';

    md.addText(`${nav.total === undefined ? `第${nav.current}页` : `第${nav.current}/${nav.total}页`}${countText} `);
    if (nav.current > 1) {
      md.addText(' ');
      md.addButton(markdownButtonLabel('上一页'), {
        data: nav.command.replace('{page}', String(nav.current - 1)),
        ...(nav.autoEnter === undefined ? {} : { autoEnter: nav.autoEnter })
      });
    }
    if (nav.total === undefined ? nav.hasNext === true : nav.current < nav.total) {
      // 中间页时与 [上一页] 保持间隙，避免误点
      if (nav.current > 1) {
        md.addText(' ');
      }
      md.addButton(markdownButtonLabel('下一页'), {
        data: nav.command.replace('{page}', String(nav.current + 1)),
        ...(nav.autoEnter === undefined ? {} : { autoEnter: nav.autoEnter })
      });
    }
    md.addNewline();
  }
  // footer
  if (footer && footer.length > 0) {
    const rows = normalizeFooterRows(footer);

    rows.forEach(row => {
      if (row.length === 0) {
        return;
      }
      md.addNewline();
      row.forEach((btn, index) => {
        if (index > 0) {
          md.addText(' ');
        }
        md.addButton(markdownButtonLabel(btn.label, btn.selected), { data: btn.command, ...(btn.autoEnter === undefined ? {} : { autoEnter: btn.autoEnter }) });
      });
    });
    md.addNewline();
  }

  // const mdBar = Format.createMarkdown();

  const bt = Format.createButtonGroup();
  const keyboardRows = keyboard ? normalizeFooterRows(keyboard) : [];

  keyboardRows.forEach(row => {
    bt.addRow();
    row.forEach(btn => {
      bt.addButton(btn.label, btn.command ?? '', { type: btn.type ?? 'command' });
    });
  });
  const bottomBar =
    bar === false
      ? []
      : (bar ?? [
          { label: '我', command: '/我' },
          { label: '战', command: '/属性面板' },
          { label: '本', command: '/查看主线' },
          { label: '动', command: '/我的活动' },
          { label: '店', command: '/商店' }
        ]);

  if (bottomBar.length > 0) {
    bt.addRow();
    bottomBar.slice(0, 5).forEach(btn => {
      if (btn.type === 'link') {
        bt.addButton(markdownButtonLabel(btn.label), btn.command ?? '', { type: 'link' });
      } else {
        bt.addButton(btn.label, btn.command ?? '');
      }
    });
  }

  if (md.value.value.length > 0) {
    format.addMarkdown(md);
  }
  if (keyboardRows.length > 0 || bottomBar.length > 0) {
    format.addButtonGroup(bt);
  }

  return { format: compactButtonSpacing(format) };
};
