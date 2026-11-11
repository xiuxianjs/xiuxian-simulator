import { Format } from 'alemonjs';
import type { LingxuAction, LingxuPage } from '@src/api/bot/lingxu';
import { buildBubble, section } from '@src/response/presentation';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText } from '@src/utils/commandPrefix';
import { addOptions, FormatGui } from '@src/utils/messageHelper';

export const lingxuBottomBar = [
  { label: '我', command: '/我', autoEnter: false },
  { label: '战', command: '/属性面板', autoEnter: false },
  { label: '本', command: '/查看主线', autoEnter: false },
  { label: '动', command: '/我的活动', autoEnter: false },
  { label: '店', command: '/商店', autoEnter: false }
];

const manual = (actions: LingxuAction[] = []) => actions.map(action => ({ ...action, autoEnter: false }));

const overviewHeader = ['/灵墟洞天 简介', '/灵墟洞天 玩法', '/灵墟洞天 入门', '/阵法师', '/灵墟洞天 行记'];
const navigationRow = ['/灵墟洞天 行动倾向', '/灵墟洞天 倾向', '/灵墟洞天 地图', '/灵墟洞天 行囊'];
const lobbyFooter = [['/灵墟洞天 入场'], navigationRow, ['/灵墟洞天 提取回执']];
const activeFooter = [['/灵墟洞天 返程', '/灵墟洞天 隐匿'], navigationRow];
const inlineOverviewLinks = [
  { prefix: '状态：', commands: ['/灵墟洞天 地图'], label: '地图' },
  { prefix: '行动：', commands: ['/灵墟洞天 行动倾向', '/灵墟洞天 倾向'], label: '倾向' },
  { prefix: '行囊：', commands: ['/灵墟洞天 行囊'], label: '打开' },
  { prefix: '阵盘：', commands: ['/阵法师'], label: '查看' }
];

function overviewContent(lines: string[], actions: LingxuAction[]) {
  const status = Format.createMarkdown();

  for (const line of lines) {
    if (line === '行踪已暴露') {
      status.addNewline().addBold(line).addNewline();
      continue;
    }
    if (line === '') {
      status.addNewline();
      continue;
    }
    if (line.startsWith('轮次：')) {
      status.addNewline();
    }
    status.addText(line);
    const link = inlineOverviewLinks.find(item => line.startsWith(item.prefix));
    const action = link && actions.find(button => link.commands.includes(button.command));

    if (link && action) {
      if (link.prefix !== '阵盘：') {
        status.addText(' ');
      }
      status.addButton(markdownButtonLabel(link.label), { data: commandText(action.command), autoEnter: false });
    }
    status.addNewline();
  }

  return Format.createMarkdown().addBlockquote(status);
}

/** Current journal rows use one section. Older servers can still send split experience and harvest fields. */
export function lingxuBubble(page: LingxuPage, bid: string, isPrivate: boolean) {
  const [overview] = page.sections;

  if (page.title === '灵墟洞天' && page.sections.length === 1) {
    const buttons = manual([...(page.actions ?? []), ...(overview.actions ?? [])].filter(action => action.command !== '/灵墟洞天 继续'));
    const byCommand = new Map(buttons.map(button => [button.command, button]));
    const row = (commands: string[]) => commands.map(command => byCommand.get(command)).filter(button => button !== undefined);
    const header = row(overviewHeader);
    const lobby = overview.lines[0] === '状态：未入场';
    const layout = lobby ? lobbyFooter : activeFooter;
    const inline = overview.lines.some(line => line.startsWith('阵盘：'));

    if (inline) {
      const footer = layout
        .flat()
        .filter(command => !navigationRow.includes(command))
        .map(command => row([command]));
      const content = overviewContent(overview.lines, [...byCommand.values()]);

      return FormatGui({ bid, isPrivate, title: page.title, header, content, footer, bar: lingxuBottomBar });
    }
    const footer = layout.map(row);

    if (header.length + footer.flat().length === buttons.length) {
      return buildBubble({
        bid,
        isPrivate,
        title: page.title,
        header,
        sections: [{ lines: overview.lines.filter(line => line !== '说明：不占用原探索、闭关或打坐。') }],
        footer,
        bar: lingxuBottomBar
      });
    }
  }
  if (
    (page.title === '灵墟洞天 · 入场确认' || page.title === '灵墟洞天 · 暂不能入场') &&
    page.sections.length === 1 &&
    overview.lines[0]?.startsWith('状态：')
  ) {
    const actions = manual(page.actions);
    const footerActions = actions.filter(button => !inlineOverviewLinks.some(link => link.commands.includes(button.command)));
    const footer = [...manual(overview.actions), ...footerActions].map(button => [button]);

    return FormatGui({ bid, isPrivate, title: page.title, content: overviewContent(overview.lines, actions), footer, bar: lingxuBottomBar });
  }
  const md = Format.createMarkdown();

  if (page.title === '灵墟洞天 · 简介' && page.sections.length === 1) {
    const story = Format.createMarkdown();

    for (const [index, paragraph] of overview.lines.entries()) {
      if (index > 0) {
        story.addNewline().addNewline();
      }
      paragraph.split(/\*\*([^*]+)\*\*/).forEach((part, offset) => {
        if (part && offset % 2 === 1) {
          story.addBold(part);
        }
        if (part && offset % 2 === 0) {
          story.addText(part);
        }
      });
    }

    return FormatGui({ bid, isPrivate, title: page.title, content: md.addBlockquote(story), footer: manual(page.actions), bar: lingxuBottomBar });
  }

  for (const [index, entry] of page.sections.entries()) {
    if (index > 0) {
      md.addNewline();
    }
    if (entry.experience === undefined && entry.harvest === undefined) {
      if (entry.title && entry.actions?.length && (page.tabs || entry.actions.some(action => /^(保护|取消保护|丢弃)$/.test(action.label)))) {
        const row = section({ title: entry.title, id: entry.id, lines: [] });

        addOptions(row, manual(entry.actions));
        row.absorb(section({ lines: entry.lines }));
        md.addBlockquote(row);
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
    header: manual(page.tabs),
    content: md,
    footer: [footer.slice(0, 4), footer.slice(4)].filter(row => row.length > 0),
    nav: page.nav ? { current: page.nav.page, total: page.nav.totalPages, count: page.nav.total, command: page.nav.command, autoEnter: false } : undefined,
    bar: lingxuBottomBar
  });
}
