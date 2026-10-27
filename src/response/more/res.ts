import { parseBackendNavigation } from '@src/api/bot/navigation';
import App, { MORE_PAGE_SIZE, parseMoreNavigation } from '@src/response-apps/more/app';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { getAppConfig } from '@src/utils/appConfig';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, onResponse, useEvent, useMe } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
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
  const selection = parseMoreNavigation(e.MessageText ?? '');
  const category = categories.find(item => item.name === selection.category);
  const md = Format.createMarkdown();

  const addEntry = (label: string, description: string, command: string) => {
    const row = Format.createMarkdown()
      .addButton(markdownButtonLabel(`${label}`), { data: command })
      .addText(` — ${description}`);

    md.addBlockquote(row);
  };

  if (!category) {
    if (selection.category) {
      md.addText('此处暂无可阅名目，请择下方入口。');
      md.addNewline();
    }
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
  const configuredGroupUrl = getAppConfig().official_group_url;
  const officialGroupUrl = (typeof configuredGroupUrl === 'string' ? configuredGroupUrl.trim() : '') || 'https://qm.qq.com/q/vdFtnG7SEK';

  const [me] = useMe();

  const share = await me.share();
  const url = share?.data?.url;
  const urlobj = url ? ({ label: '分享我', command: url, type: 'link' } as const) : undefined;

  const reply = FormatGui({
    isPrivate: e.isPrivate ?? false,
    bid,
    title: '仙途百事',
    header: [
      { label: '安全中心', command: '/安全中心' },
      { label: '登录', command: '/登录' }
    ],
    footer: [
      { label: '任务设置', command: '/任务设置' },
      { label: '我的设置', command: '/我的设置' }
    ],
    content: md,
    keyboard: urlobj
      ? [{ label: '加入群聊', command: officialGroupUrl, type: 'link' }, urlobj]
      : [{ label: '加入群聊', command: officialGroupUrl, type: 'link' }]
  });

  void message.send(reply);
});
