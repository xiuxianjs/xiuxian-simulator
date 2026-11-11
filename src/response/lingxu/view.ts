import { Format } from 'alemonjs';
import type { LingxuAction, LingxuPage } from '@src/api/bot/lingxu';
import { section } from '@src/response/presentation';
import { addOptions, FormatGui } from '@src/utils/messageHelper';

export const lingxuBottomBar = [
  { label: '我', command: '/我', autoEnter: false },
  { label: '战', command: '/属性面板', autoEnter: false },
  { label: '本', command: '/查看主线', autoEnter: false },
  { label: '动', command: '/我的活动', autoEnter: false },
  { label: '店', command: '/商店', autoEnter: false }
];

const manual = (actions: LingxuAction[] = []) => actions.map(action => ({ ...action, autoEnter: false }));

/** Normal objects reuse presentation.section; event records keep the requested two quote blocks. */
export function lingxuBubble(page: LingxuPage, bid: string, isPrivate: boolean) {
  const md = Format.createMarkdown();

  for (const [index, entry] of page.sections.entries()) {
    if (index > 0) {
      md.addNewline();
    }
    if (entry.experience === undefined && entry.harvest === undefined) {
      if (entry.title && entry.actions?.some(action => /^(保护|取消保护)$/.test(action.label))) {
        const holding = section({ title: entry.title, id: entry.id, lines: [] });

        addOptions(holding, manual(entry.actions));
        holding.absorb(section({ lines: entry.lines }));
        md.addBlockquote(holding);
      } else {
        md.addBlockquote(section({ ...entry, actions: manual(entry.actions) }));
      }
      continue;
    }
    md.absorb(section({ title: entry.title, id: entry.id, lines: entry.lines }));
    if (entry.experience !== undefined) {
      md.addNewline().addText('经历：').addNewline();
      md.addBlockquote(section({ lines: entry.experience }));
    }
    if (entry.harvest !== undefined) {
      md.addNewline().addText('收获：').addNewline();
      md.addBlockquote(section({ lines: entry.harvest }));
    }
    if (entry.actions?.length) {
      addOptions(md, manual(entry.actions));
    }
  }
  const footer = manual(page.actions);

  return FormatGui({
    bid,
    isPrivate,
    title: page.title,
    content: md,
    footer: [footer.slice(0, 4), footer.slice(4)].filter(row => row.length > 0),
    nav: page.nav ? { current: page.nav.page, total: page.nav.totalPages, count: page.nav.total, command: page.nav.command, autoEnter: false } : undefined,
    bar: lingxuBottomBar
  });
}
