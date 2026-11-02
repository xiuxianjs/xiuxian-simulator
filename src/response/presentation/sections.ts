import { addOptions } from '@src/utils/messageHelper';
import { Format, type FormatMarkDown } from 'alemonjs';
import { STATUS_SYMBOL, type BubbleStatus } from './tokens';

export type BubbleAction = {
  label: string;
  command: string;
  autoEnter?: boolean;
};

export type BubbleSection = {
  /** 对象行：一个引用块只描述一个对象。 */
  title?: string;
  /** 对象编号：跟在加粗名称后、不加粗，如 `#301`。 */
  id?: string | number;
  /** 对象标记：锁定/上架/礼盒等，跟在编号后。 */
  suffix?: string;
  status?: BubbleStatus;
  lines: string[];
  /** 对象级操作，跟随所属对象留在同一引用块内。 */
  actions?: BubbleAction[];
};

/**
 * 引用块：一个对象/一个分组。
 * 顺序固定为「对象行（加粗）→ #编号 → 状态符号 → 对象标记 → 事实行 → 行内按钮」。
 */
export const section = (input: BubbleSection): FormatMarkDown => {
  const md = Format.createMarkdown();
  const status = input.status ?? 'none';
  const symbol = status === 'none' ? '' : STATUS_SYMBOL[status];
  // 无标题时状态符号并入首行，避免符号独占一行。
  const lines = input.lines.length > 0 && !input.title && symbol ? [`${symbol} ${input.lines[0]}`, ...input.lines.slice(1)] : input.lines;

  if (input.title) {
    md.addBold(input.title);
    if (input.id !== undefined && input.id !== '') {
      md.addText(` #${input.id}`);
    }
    if (symbol) {
      md.addText(` ${symbol}`);
    }
    if (input.suffix) {
      md.addText(` ${input.suffix}`);
    }
    if (lines.length > 0) {
      md.addNewline();
    }
  } else if (symbol && lines.length === 0) {
    md.addText(symbol);
  }

  lines.forEach((line, index) => {
    if (index > 0) {
      md.addNewline();
    }
    md.addText(line);
  });

  if (input.actions && input.actions.length > 0) {
    addOptions(md, input.actions);
  }

  return md;
};
