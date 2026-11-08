import { parseBackendNavigation } from '@src/api/bot/navigation';
import App, { MORE_PAGE_SIZE, parseMoreNavigation } from '@src/response-apps/more/app';
import { COMMAND_CATALOG } from '@src/response-apps/more/commandCatalog';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { getAppConfig } from '@src/utils/appConfig';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText } from '@src/utils/commandPrefix';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, onResponse, useEvent } from 'alemonjs';

const COMMAND_TABLE_PAGE_SIZE = 10;
const COMMAND_TABLE_ENTRY = '/更多 指令大全';
const COMMAND_TABLE_HEADER = '| 功能类型 | 指令 | 参数 | 作用 |\n| --- | --- | --- | --- |';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const selection = parseMoreNavigation(e.MessageText ?? '');

  if (selection.category === '指令大全') {
    const count = COMMAND_CATALOG.length;
    const total = Math.max(1, Math.ceil(count / COMMAND_TABLE_PAGE_SIZE));
    const current = Math.min(selection.page, total);
    const start = (current - 1) * COMMAND_TABLE_PAGE_SIZE;
    const rows = COMMAND_CATALOG.slice(start, start + COMMAND_TABLE_PAGE_SIZE).map(([category, commands, parameters, description]) => {
      const commandCell = commands.map(command => `\`${command}\``).join('、');
      const parameterCell = parameters ? `\`${parameters}\`` : '—';

      return `| ${category} | ${commandCell} | ${parameterCell} | ${description} |`;
    });
    const table = [COMMAND_TABLE_HEADER, ...rows].join('\n');

    await message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '指令大全',
        content: Format.createMarkdown().addNewline().addText(table).addNewline(),
        nav: { current, total, count, command: `${COMMAND_TABLE_ENTRY} {page}` },
        footer: [{ label: '返回更多', command: '/更多' }],
        bar: false
      })
    );

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
    void message.send(
      FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '导航', content: Format.createMarkdown().addText('导航获取失败，请稍后再试。') })
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
      md.addText('此处暂无可阅名目，请择下方入口。');
      md.addNewline();
    }
    addEntry('指令大全', '查阅指令、参数与用途', COMMAND_TABLE_ENTRY);
    for (const item of categories.filter(item => !item.parent)) {
      addEntry(item.displayName ?? item.name, item.description, `/更多 ${item.name}`);
    }
    if (!categories.length) {
      md.addText('尚未踏入仙途，可先查看问道指南。');
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
        header: [
          {
            label: category.parent ? `回${categories.find(item => item.name === category.parent)?.displayName ?? category.parent}` : '回仙途百事',
            command: category.parent ? `/更多 ${category.parent}` : '/更多'
          },
          ...categories
            .filter(item => item.parent && item.parent === category.parent)
            .map(item => ({ label: item.displayName ?? item.name, selected: item.name === category.name, command: `/更多 ${item.name}` })),
          { label: '登录', command: '/登录' }
        ],
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
