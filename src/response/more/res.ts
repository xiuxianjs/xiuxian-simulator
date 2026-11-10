import { randomBytes } from 'node:crypto';
import { parseBackendNavigation } from '@src/api/bot/navigation';
import App, { MORE_PAGE_SIZE, parseMoreNavigation } from '@src/response-apps/more/app';
import { COMMAND_CATALOG } from '@src/response-apps/more/commandCatalog';
import { selects } from '@src/response/config';
import { buildBubble, type BubbleSection } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { getAppConfig } from '@src/utils/appConfig';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText, displayCommandText } from '@src/utils/commandPrefix';
import { FormatGui, type GuiFooter } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, getConfig, onResponse, useEvent } from 'alemonjs';

const COMMAND_TABLE_ENTRY = '/指令大全';
const SEARCH_ENTRY = '/指令搜索';
const TABLE_PAGE_SIZE = 10;
const SEARCH_TTL_MS = 10 * 60 * 1000;
const SEARCH_LIMIT = 500;
const searchButton = { label: '指令搜索', command: SEARCH_ENTRY, autoEnter: false };
const backToTable = { label: '返回指令表', command: COMMAND_TABLE_ENTRY };

type SearchSnapshot = { scope: string; expires: number; entries: typeof COMMAND_CATALOG };
// Only public catalog rows are retained. The raw query is never stored or used in buttons.
const searchesByConfig = new WeakMap<ReturnType<typeof getConfig>, Map<string, SearchSnapshot>>();
const catalogCategories = [...new Set(COMMAND_CATALOG.map(([category]) => category))];

function catalogPage(isPrivate: boolean, bid: string, scope: string | undefined, requestedPage: number) {
  const title = '指令大全';
  const backToMore = { label: '返回更多', command: '/更多' };
  const category = catalogCategories.find(name => name === scope);

  if (scope && !category && !/^\d+$/.test(scope)) {
    const count = catalogCategories.length;
    const total = Math.ceil(count / MORE_PAGE_SIZE);
    const current = scope === '分类' ? Math.min(requestedPage, total) : 1;
    const start = (current - 1) * MORE_PAGE_SIZE;
    const sections: BubbleSection[] = catalogCategories.slice(start, start + MORE_PAGE_SIZE).map(name => ({
      lines: [],
      actions: [{ label: name, command: `${COMMAND_TABLE_ENTRY} ${name}` }]
    }));

    if (scope !== '分类') {
      sections.unshift({ lines: ['未找到该分类，请从下方选择。'] });
    }

    return buildBubble({
      isPrivate,
      bid,
      title: '指令大全 · 分类',
      sections,
      nav: { current, total, count, command: `${COMMAND_TABLE_ENTRY} 分类 {page}` },
      footer: [{ label: '返回指令表', command: COMMAND_TABLE_ENTRY }, backToMore],
      bar: false
    });
  }

  const entries = category ? COMMAND_CATALOG.filter(([name]) => name === category) : COMMAND_CATALOG;
  const numericPage = Number(scope);
  const page = category ? requestedPage : Number.isSafeInteger(numericPage) && numericPage > 0 ? numericPage : 1;

  const categoryIndex = category ? catalogCategories.indexOf(category) : 0;
  const categoryStart = Math.max(0, Math.min(categoryIndex - 1, catalogCategories.length - 3));
  const categoryButtons = catalogCategories.slice(categoryStart, categoryStart + 3).map(name => ({
    label: name,
    selected: name === category,
    command: `${COMMAND_TABLE_ENTRY} ${name} 1`
  }));

  return commandTable({
    isPrivate,
    bid,
    title: category ? `${title} · ${category}` : title,
    entries,
    page,
    pageSize: category ? MORE_PAGE_SIZE : TABLE_PAGE_SIZE,
    command: `${COMMAND_TABLE_ENTRY}${category ? ` ${category}` : ''} {page}`,
    footer: [
      [{ label: '全部', selected: !category, command: `${COMMAND_TABLE_ENTRY} 1` }, ...categoryButtons],
      [{ label: '更多分类', command: `${COMMAND_TABLE_ENTRY} 分类` }, searchButton, backToMore]
    ]
  });
}

function commandTable({
  isPrivate,
  bid,
  title,
  entries,
  page,
  pageSize,
  command,
  footer
}: {
  isPrivate: boolean;
  bid: string;
  title: string;
  entries: typeof COMMAND_CATALOG;
  page: number;
  pageSize: number;
  command: string;
  footer: GuiFooter;
}) {
  const count = entries.length;
  const total = Math.ceil(count / pageSize);
  const current = Math.min(page, total);
  const start = (current - 1) * pageSize;
  const rows = entries.slice(start, start + pageSize).map(([name, commands, parameters, description]) => {
    const commandCell = commands.map(command => `\`${displayCommandText(command)}\``).join('、');
    const parameterCell = parameters ? `\`${parameters}\`` : '—';

    return `| ${name} | ${commandCell} | ${parameterCell} | ${description} |`;
  });
  const table = ['| 功能类型 | 指令 | 参数 | 作用 |', '| --- | --- | --- | --- |', ...rows].join('\n');

  return FormatGui({
    isPrivate,
    bid,
    title,
    content: Format.createMarkdown().addNewline().addText(table).addNewline(),
    nav: total > 1 ? { current, total, count, command } : undefined,
    footer,
    bar: false
  });
}

type SearchSelection = Extract<ReturnType<typeof parseMoreNavigation>, { search: string }>;
type SearchEvent = { UserId: string; isPrivate?: boolean; Platform?: string; BotId?: string; ChannelId?: string };

function searchPage(event: SearchEvent, selection: SearchSelection) {
  const isPrivate = event.isPrivate ?? false;
  const bid = event.UserId;
  const scope = JSON.stringify([event.Platform, event.BotId, event.ChannelId, bid, isPrivate]);
  const config = getConfig();
  let searches = searchesByConfig.get(config);

  if (!searches) {
    searches = new Map();
    searchesByConfig.set(config, searches);
  }

  const title = '指令搜索';
  const footer = [searchButton, backToTable];
  const notice = (text: string) => buildBubble({ isPrivate, bid, title, sections: [{ lines: [text] }], footer, bar: false });
  const now = Date.now();
  let entries: typeof COMMAND_CATALOG;
  let reference: string | undefined;

  if (selection.search === 'page') {
    reference = selection.reference;
    const snapshot = reference ? searches.get(reference) : undefined;

    if (snapshot?.scope !== scope || snapshot.expires <= now) {
      return notice(`搜索结果已失效，请重新发送 ${displayCommandText(SEARCH_ENTRY)} 关键词。`);
    }
    entries = snapshot.entries;
  } else {
    const keyword = selection.keyword.normalize('NFKC').toLowerCase();

    if (!keyword || [...keyword].length > 80) {
      return notice(`发送 ${displayCommandText(SEARCH_ENTRY)} 关键词，可查找功能类型或用途。关键词最多 80 个字符。`);
    }

    const terms = keyword.split(/\s+/);

    entries = COMMAND_CATALOG.filter(([category, , , description]) => terms.every(term => category.normalize('NFKC').toLowerCase().includes(term) || description.normalize('NFKC').toLowerCase().includes(term))
    );

    if (!entries.length) {
      return notice('没有找到匹配的指令，可以换个更短的关键词。');
    }

    if (entries.length > TABLE_PAGE_SIZE) {
      for (const [id, snapshot] of searches) {
        if (snapshot.expires <= now) {
          searches.delete(id);
        }
      }

      if (searches.size >= SEARCH_LIMIT) {
        const oldest = searches.keys().next();

        if (!oldest.done) {
          searches.delete(oldest.value);
        }
      }

      do {
        reference = randomBytes(12).toString('hex');
      } while (searches.has(reference));

      searches.set(reference, { scope, expires: now + SEARCH_TTL_MS, entries });
    }
  }

  return commandTable({
    isPrivate,
    bid,
    title,
    entries,
    page: selection.search === 'page' ? selection.page : 1,
    pageSize: TABLE_PAGE_SIZE,
    command: reference ? `/指令搜索翻页 ${reference} {page}` : '',
    footer
  });
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const selection = parseMoreNavigation(e.MessageText ?? '');

  if ('search' in selection && selection.search) {
    await message.send(searchPage(e, selection));

    return;
  }

  if (selection.catalog) {
    await message.send(catalogPage(e.isPrivate ?? false, bid, selection.scope, selection.page));

    return;
  }

  const [, parentNext] = useEvent();
  let access;

  try {
    const result = await runRobotBusiness(e, 'navigation.more', {}, parseBackendNavigation, parentNext);

    if (result.handled) {
      return;
    }
    access = result.data;
  } catch {
    await message.send(
      buildBubble({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '仙途百事',
        sections: [{ lines: ['导航加载失败，请稍后重试。'] }],
        footer: [{ label: '指令大全', command: COMMAND_TABLE_ENTRY }],
        bar: false
      })
    );

    return;
  }
  const visibleCommands = access.registered ? [...access.moreVisibleCommands, ...access.foldVisibleCommands] : access.moreVisibleCommands;
  const { categories } = App(visibleCommands).data;
  const category = categories.find(item => item.name === selection.category);
  const md = Format.createMarkdown();

  const addEntry = (label: string, description: string, command: string) => {
    const row = Format.createMarkdown()
      .addButton(markdownButtonLabel(`${label}`), { data: commandText(command) })
      .addText(` — ${description}`);

    md.addBlockquote(row);
  };

  if (!category) {
    if (selection.category) {
      md.addText('该分类暂不可用，请从下方选择。');
      md.addNewline();
    }
    addEntry('指令大全', '按玩法查找指令和参数', COMMAND_TABLE_ENTRY);
    for (const item of categories.filter(item => !item.parent)) {
      addEntry(item.displayName ?? item.name, item.description, `/更多 ${item.name}`);
    }
  } else {
    const total = Math.max(1, Math.ceil(category.entries.length / MORE_PAGE_SIZE));
    const current = Math.min(selection.page, total);

    for (const entry of category.entries.slice((current - 1) * MORE_PAGE_SIZE, current * MORE_PAGE_SIZE)) {
      addEntry(entry.label, entry.description, entry.command);
    }
    void message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: category.displayName ?? category.name,
        content: md,
        header: categories
          .filter(item => category.parent && item.parent === category.parent && item.name !== category.name)
          .map(item => ({ label: item.displayName ?? item.name, command: `/更多 ${item.name}` })),
        footer: [
          category.parent
            ? {
                label: `返回${categories.find(item => item.name === category.parent)?.displayName ?? category.parent}`,
                command: `/更多 ${category.parent}`
              }
            : { label: '返回更多', command: '/更多' }
        ],
        bar: false,
        nav: total > 1 ? { current, total, command: `/更多 ${category.name} {page}` } : undefined
      })
    );

    return;
  }
  const configuredGroupUrl = getAppConfig()?.official_group_url;

  const officialGroupUrl = (typeof configuredGroupUrl === 'string' ? configuredGroupUrl.trim() : '') || 'https://qm.qq.com/q/vdFtnG7SEK';

  const reply = FormatGui({
    isPrivate: e.isPrivate ?? false,
    bid,
    title: '仙途百事',
    header: [
      { label: '安全中心', command: '/安全中心' },
      { label: '登录', command: '/登录' }
    ],
    footer: [
      { label: '我的设置', command: '/我的设置' },
      { label: '任务设置', command: '/任务设置' }
    ],
    content: md,
    keyboard: configuredGroupUrl ? [{ label: '加入群聊', command: officialGroupUrl, type: 'link' }] : []
  });

  void message.send(reply);
});
