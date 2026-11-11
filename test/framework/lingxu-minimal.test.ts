import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseLingxuPage, type LingxuPage } from '../../src/api/bot/lingxu';
import { parseLingxuCommand, validLingxuReference } from '../../src/response/lingxu/commands';
import handler from '../../src/response/lingxu/res';
import activity from '../../src/response/activity/res';
import profession from '../../src/response/profession/myProfession/res';
import marketBrowse from '../../src/response/market/list/res';
import marketSell from '../../src/response/market/sell/res';
import { businessEnvelope, gameFixture } from './fixture';
import { lingxuJournal, lingxuJournalDetail, lingxuOuterMap, lingxuPages, lingxuRef } from './lingxu-minimal-fixtures';
import { commandText } from '../../src/utils/commandPrefix';
import { createGameRouter } from '../../src/router';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

type Node = { type?: string; value?: unknown; options?: Record<string, unknown> };
const nodes = (items: unknown[]): Node[] => items.flatMap(raw => {
  if (!raw || typeof raw !== 'object') return [];
  const item = raw as Node;
  return [item, ...(Array.isArray(item.value) ? nodes(item.value) : [])];
});
function delivery(result: TestRunResult, maxActions = 10) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const all = nodes(message.nodes);
  const buttons = all.filter(item => item.type === 'MD.button');
  for (const button of buttons) {
    assert.equal(button.options?.autoEnter, false);
    assert.equal(button.options?.show, undefined);
    assert.ok([...String(button.options?.data)].length <= 80);
  }
  const native = all.filter(item => item.type === 'Button');
  assert.deepEqual(native.map(item => item.value), ['我', '战', '本', '动', '店']);
  assert.ok(buttons.length <= maxActions);
  return inspectMessage(message.nodes);
}

for (const entry of lingxuPages) {
  for (const isPrivate of [false, true]) test(`minimal lingxu actual handler (${isPrivate ? 'private' : 'group'}): ${entry.command}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.page));
    const options = { text: entry.command, platform: 'qq-bot', userId: 'lingxu-member' };
    const event = isPrivate ? app.events.privateMessage(options) : app.events.groupMessage({ ...options, groupId: 'lingxu-group', channelId: 'lingxu-group' });
    const result = await app.runHandler(handler, event);
    const view = delivery(result);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/lingxu.command'));
    assert.deepEqual(requests[0].body.arguments, {});
    assert.equal(requests[0].body.messageText, entry.command);
    assert.equal(requests[0].bid, event.UserId);
    const groupId = event.name === 'message.create' ? event.ChannelId : undefined;
    assert.equal(requests[0].body.channelId, groupId);
    for (const expected of entry.expected) assert.ok(view.text.includes(expected), view.text);
    if (entry.command === '/灵墟洞天 入场') {
      assertCaveOverview(result, entry.page.sections[0].lines.filter(Boolean), [], [['‹确认入场›'], ['‹取消›']], homeLinks);
      assert.ok(view.commands.includes(`/灵墟洞天 确认 ${lingxuRef}`));
    }
    assert.equal(result.messages[0].target?.targetId, groupId ?? event.UserId);
    const mentions = nodes(result.messages[0].nodes).filter(node => node.type === 'MD.mention');
    assert.deepEqual(mentions.map(node => node.value), isPrivate ? [] : [event.UserId]);
    assert.equal(result.nextCalls.length, 0);
  });
}

test('all generated page buttons round-trip to the domain parser without changing their payload', async t => {
  const commands = lingxuPages.flatMap(entry => [...(entry.page.actions ?? []), ...entry.page.sections.flatMap(section => section.actions ?? [])].map(action => action.command));
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, lingxuPages[0].page));
  for (const command of new Set(commands)) {
    const parsed = parseLingxuCommand(command);
    assert.ok(parsed && !('error' in parsed));
    delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
});

test('the cave homepage opens the origin story in group and private chat', async t => {
  const home = '/灵墟洞天';
  const introduction = '/灵墟洞天 简介';
  const homePage = lingxuPages[0].page;
  const storyPage = {
    title: '灵墟洞天 · 简介', privateOnly: false,
    sections: [{ lines: ['上古司辰一脉将一片山河炼入周天界阵。', '近年，旧罗盘一齐指向无人荒谷。', '以**墟行囊**暂存所得，再借**阵盘**接引星轨。'] }],
    actions: [{ label: '返回洞天', command: home }]
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.body.messageText === introduction ? storyPage : {
      ...homePage,
      sections: homePage.sections.map(section => ({ ...section, actions: [{ label: '简介', command: introduction }] }))
    }));
  for (const isPrivate of [false, true]) {
    const event = (text: string) => {
      const options = { text, platform: 'qq-bot', userId: 'lingxu-reader' };
      return isPrivate ? app.events.privateMessage(options) : app.events.groupMessage({ ...options, groupId: 'lingxu-group', channelId: 'lingxu-group' });
    };
    const result = await app.runHandler(handler, event(home));
    delivery(result);
    const overview = nodes(result.messages[0].nodes).find(node => node.type === 'MD.blockquote');
    assert.ok(Array.isArray(overview?.value));
    const button = nodes(result.messages[0].nodes).find(node => node.type === 'MD.button' && node.value === '‹简介›');
    assert.ok(button);
    assert.equal(button.options?.data, introduction);
    assert.deepEqual(parseLingxuCommand(introduction), { readOnly: true });

    const story = await app.runHandler(handler, event(String(button.options?.data)));
    const view = delivery(story);
    const storyNodes = nodes(story.messages[0].nodes);
    const quotes = storyNodes.filter(node => node.type === 'MD.blockquote');
    assert.match(view.text, /灵墟洞天 · 简介/);
    assert.equal(quotes.length, 1);
    const renderedStory = (quotes[0].value as Node[]).map(node => {
      if (node.type === 'MD.bold') return `**${node.value}**`;
      if (node.type === 'MD.newline') return '\n';
      return node.value;
    }).join('');
    assert.equal(renderedStory, storyPage.sections[0].lines.join('\n\n'));
    const back = storyNodes.find(node => node.type === 'MD.button' && node.value === '‹返回洞天›');
    assert.equal(back?.options?.data, home);
    assert.equal(requests.at(-1)?.body.messageText, introduction);
  }
});

function assertCaveOverview(result: TestRunResult, status: string[], header: string[], footer: string[][], inlineLinks: Record<string, [string, string]>, exposed = false) {
  delivery(result);
  const body = result.messages[0].nodes.find(node => node.type === 'Markdown')?.value ?? [];
  const quoteIndex = body.findIndex(node => node.type === 'MD.blockquote');
  assert.ok(quoteIndex > 0);
  assert.equal(body.filter(node => node.type === 'MD.blockquote').length, 1);
  assert.deepEqual(body.slice(0, quoteIndex).filter(node => node.type === 'MD.button').map(node => node.value), header);
  const statusQuote = body[quoteIndex];
  assert.ok(statusQuote.type === 'MD.blockquote');
  const quote = statusQuote.value as Node[];
  assert.deepEqual(quote.filter(node => node.type === 'MD.text').map(node => String(node.value).trim()).filter(Boolean), status);
  assert.deepEqual(quote.filter(node => node.type === 'MD.bold').map(node => node.value), exposed ? ['行踪已暴露'] : []);
  for (const [index, node] of quote.entries()) {
    if (node.type === 'MD.bold' || /^(轮次|消耗)：/.test(String(node.value))) {
      assert.deepEqual(quote.slice(index - 2, index).map(node => node.type), ['MD.newline', 'MD.newline']);
    }
  }
  let currentLine = '';
  const links: typeof inlineLinks = {};
  for (const node of quote) {
    if (node.type === 'MD.text' && String(node.value).trim()) currentLine = String(node.value);
    if (node.type === 'MD.newline') currentLine = '';
    if (node.type === 'MD.button') links[currentLine.split('：')[0]] = [String(node.value), String(node.options?.data)];
  }
  assert.deepEqual(links, inlineLinks);
  const rows: unknown[][] = [[]];
  for (const node of body.slice(quoteIndex + 1)) {
    if (node.type === 'MD.newline') rows.push([]);
    if (node.type === 'MD.button') rows.at(-1)?.push(node.value);
  }
  assert.deepEqual(rows.filter(row => row.length > 0), footer);
}

const homeLinks: Record<string, [string, string]> = {
  状态: ['‹地图›', '/灵墟洞天 地图'],
  行动: ['‹倾向›', '/灵墟洞天 行动倾向'],
  行囊: ['‹打开›', '/灵墟洞天 行囊'],
  阵盘: ['‹查看›', '/阵法师']
};

test('the cave lobby shows inline links and opens the renamed walkthrough', async t => {
  const status = ['状态：未入场', '行动：未入场', '命数：4/5 · 每60分钟恢复1点', '行囊：0/60格', '阵盘：道蕴阵'];
  const page = {
    title: '灵墟洞天',
    privateOnly: false,
    sections: [{
      lines: status,
      actions: [{ label: '简介', command: '/灵墟洞天 简介' }, { label: '玩法', command: '/灵墟洞天 玩法' }]
    }],
    actions: [
      { label: '准备入场', command: '/灵墟洞天 入场' },
      { label: '行动倾向', command: '/灵墟洞天 行动倾向' },
      { label: '地图', command: '/灵墟洞天 地图' },
      { label: '行囊', command: '/灵墟洞天 行囊' },
      { label: '阵法师', command: '/阵法师' },
      { label: '行记', command: '/灵墟洞天 行记' },
      { label: '提取回执', command: '/灵墟洞天 提取回执' }
    ]
  };
  const guide = '/灵墟洞天 玩法';
  const guidePage = {
    title: '灵墟洞天 · 玩法', privateOnly: false,
    sections: [{ title: '第一次入场', lines: ['说明：先设置行动倾向，再确认入场。'], actions: [{ label: '行动倾向', command: '/灵墟洞天 行动倾向' }] }],
    actions: [{ label: '返回洞天', command: '/灵墟洞天' }]
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.body.messageText === guide ? guidePage : page));
  const run = (command: string) => app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  const result = await run('/灵墟洞天');
  assertCaveOverview(result, status, ['‹简介›', '‹玩法›', '‹阵法师›', '‹行记›'], [['‹准备入场›'], ['‹提取回执›']], homeLinks);
  const button = nodes(result.messages[0].nodes).find(node => node.type === 'MD.button' && node.value === '‹玩法›');
  assert.equal(button?.options?.data, guide);
  const walkthrough = delivery(await run(String(button?.options?.data)));
  assert.match(walkthrough.text, /灵墟洞天 · 玩法/);
  assert.match(walkthrough.text, /先设置行动倾向/);
  assert.ok(walkthrough.commands.includes('/灵墟洞天 行动倾向'));
  assert.equal(requests.at(-1)?.body.messageText, guide);
});

test('the active cave home shows rest only before resting and resumes without a button', async t => {
  const overview = '/灵墟洞天';
  const rest = '/灵墟洞天 隐匿';
  const status = ['状态：探索中(坤·阳·废弃坊市)', '行动：保守 · 对人躲避 · 对怪战斗', '命数：4/5 · 每60分钟恢复1点', '行囊：0/60格', '阵盘：道蕴阵 · 余1时43分'];
  const active = [...status, '轮次：下次结算00:10'];
  const resting = [...status, '说明：休息中，命数恢复后自动探索。'];
  const { app, requests } = await gameFixture(t, request => {
    const isResting = request.body.messageText === rest;
    return businessEnvelope(request.bid, {
      title: '灵墟洞天', privateOnly: false,
      sections: [{ lines: isResting ? resting : [...active, '行踪已暴露'], actions: [{ label: '简介', command: '/灵墟洞天 简介' }, { label: '玩法', command: '/灵墟洞天 玩法' }] }],
      actions: [
        { label: '行动倾向', command: '/灵墟洞天 行动倾向' },
        { label: '地图', command: '/灵墟洞天 地图' },
        { label: '行囊', command: '/灵墟洞天 行囊' },
        { label: '阵法师', command: '/阵法师' },
        { label: '行记', command: '/灵墟洞天 行记' },
        { label: '返程', command: '/灵墟洞天 返程' },
        isResting ? { label: '继续探索', command: '/灵墟洞天 继续' } : { label: '休息', command: rest }
      ]
    });
  });
  const run = (command: string) => app.runHandler(handler, app.events.groupMessage({ text: command, platform: 'qq-bot', userId: 'cave-member' }));
  const header = ['‹简介›', '‹玩法›', '‹阵法师›', '‹行记›'];
  const activeView = await run(overview);
  assertCaveOverview(activeView, active, header, [['‹返程›'], ['‹休息›']], homeLinks, true);
  const restButton = nodes(activeView.messages[0].nodes).find(node => node.type === 'MD.button' && node.value === '‹休息›');
  assert.equal(restButton?.options?.data, rest);
  const restingView = await run(String(restButton?.options?.data));
  assertCaveOverview(restingView, resting, header, [['‹返程›']], homeLinks);
  assert.equal(requests.at(-1)?.body.messageText, rest);
});

test('map tabs precede the whole ring and each move button shares the region name line', async t => {
  const command = '/灵墟洞天 地图 外围';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, lingxuOuterMap));
  const options = { text: command, platform: 'qq-bot', userId: 'map-viewer' };
  for (const event of [app.events.groupMessage(options), app.events.privateMessage(options)]) {
    const result = await app.runHandler(handler, event);
    const view = delivery(result, 13);
    const all = nodes(result.messages[0].nodes);
    const tabs = all.slice(0, all.findIndex(node => node.type === 'MD.blockquote')).filter(node => node.type === 'MD.button');
    assert.deepEqual(tabs.map(node => node.value), ['‹▶外围›', '‹内围›', '‹核心›']);
    assert.deepEqual(tabs.map(node => node.options?.data), lingxuOuterMap.tabs?.map(tab => tab.command));
    const quotes = all.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 8);
    for (const [index, region] of lingxuOuterMap.sections.entries()) {
      const children = nodes(quotes[index].value as unknown[]).filter(node => node.type !== 'MD.text' || String(node.value).trim());
      assert.equal(children[0].type, 'MD.bold');
      assert.equal(children[0].value, region.title);
      assert.equal(children[1].type, 'MD.button');
      assert.equal(children[1].options?.data, region.actions?.[0].command);
      assert.equal(children[2].type, 'MD.newline');
      assert.deepEqual(children.filter(node => node.type === 'MD.text').map(node => node.value), region.lines);
    }
    assert.equal(view.commands.length, 18);
    assert.doesNotMatch(view.text, /通道|第\d+\/|由此撤离/);
    assert.ok(view.commands.includes('/灵墟洞天 出口'));
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
});

test('only the three map tiers and the separate exit selector are accepted as new reads', () => {
  for (const suffix of ['地图', '地图 外围', '地图 内围', '地图 核心', '地图 2', '出口']) {
    assert.deepEqual(parseLingxuCommand(`/灵墟洞天 ${suffix}`), { readOnly: true });
  }
  for (const suffix of ['地图 回显占位词', '地图 外围 2', '出口 kan']) {
    assert.deepEqual(parseLingxuCommand(`/灵墟洞天 ${suffix}`), { error: true });
  }
  assert.throws(() => parseLingxuPage({ ...lingxuOuterMap, tabs: [{ label: '▶外围', command: '/灵墟洞天 地图 内围' }, ...lingxuOuterMap.tabs!.slice(1)] }));
  assert.throws(() => parseLingxuPage({ ...lingxuOuterMap, sections: [...lingxuOuterMap.sections, lingxuOuterMap.sections[0]] }));
});

test('each compact diary record has a bold time and its own fill-only detail button', async t => {
  const detailCommand = '/灵墟洞天 记录 4';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.body.messageText === detailCommand ? lingxuJournalDetail : lingxuJournal));
  for (const isPrivate of [false, true]) {
    const event = (text: string) => {
      const options = { text, platform: 'qq-bot', userId: 'lingxu-member' };
      return isPrivate ? app.events.privateMessage(options) : app.events.groupMessage({ ...options, groupId: 'lingxu-group', channelId: 'lingxu-group' });
    };
    const list = await app.runHandler(handler, event('/灵墟洞天 行记'));
    const view = delivery(list);
    const quotes = nodes(list.messages[0].nodes).filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, lingxuJournal.sections.length);
    for (const [index, record] of lingxuJournal.sections.entries()) {
      assert.ok(Array.isArray(quotes[index].value));
      const children = nodes(quotes[index].value as unknown[]).filter(node => node.type !== 'MD.newline' && String(node.value).trim());
      assert.equal(children[0].type, 'MD.bold');
      assert.equal(children[0].value, record.title);
      assert.deepEqual(children.filter(node => node.type === 'MD.text').map(node => node.value), [` #${record.id}`, ...record.lines]);
      assert.equal(children.at(-1)?.type, 'MD.button');
      assert.equal(children.at(-1)?.options?.data, record.actions?.[0].command);
    }
    assert.doesNotMatch(view.text, /行动记录|交战 3 回合|损失|托管/);
    assert.ok(view.commands.includes('/灵墟洞天 推送设置'));
    const detail = delivery(await app.runHandler(handler, event(detailCommand)));
    assert.match(detail.text, /行动详情/);
    assert.match(detail.text, /交战 3 回合/);
    assert.ok(detail.commands.includes('/灵墟洞天 行记'));
    assert.equal(requests.at(-1)?.body.messageText, detailCommand);
  }
});

test('diary push settings send only fixed modes and carry the current group identity', async t => {
  const settings = '/灵墟洞天 推送设置';
  const groupTarget = { platform: 'qq-bot', BotId: '100017', scope: 'group', targetId: 'lingxu-group' };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    title: '灵墟洞天 · 推送设置', privateOnly: false,
    sections: [{ lines: ['状态：当前推送到私聊'] }],
    actions: [
      ...(request.body.groupTarget ? [{ label: '推送到本群', command: `${settings} 本群` }] : []),
      { label: '推送到私聊', command: `${settings} 私聊` },
      { label: '关闭推送', command: `${settings} 关闭` },
      { label: '返回行记', command: '/灵墟洞天 行记' }
    ]
  }));
  for (const isPrivate of [false, true]) {
    const run = async (text: string) => {
      const options = { text, platform: 'qq-bot', botId: groupTarget.BotId, userId: 'lingxu-member' };
      const event = isPrivate ? app.events.privateMessage(options) : app.events.groupMessage({ ...options, groupId: 'lingxu-group', channelId: 'lingxu-group' });
      return delivery(await app.runHandler(handler, event));
    };
    const view = await run(settings);
    assert.deepEqual(parseLingxuCommand(settings), { readOnly: true });
    assert.match(view.text, /当前推送到私聊/);
    assert.equal(requests.at(-1)?.body.channelId, isPrivate ? undefined : 'lingxu-group');
    assert.deepEqual(requests.at(-1)?.body.groupTarget, isPrivate ? undefined : groupTarget);
    assert.equal(view.commands.includes(`${settings} 本群`), !isPrivate);
    for (const command of view.commands.filter(command => command.startsWith(`${settings} `))) {
      assert.deepEqual(parseLingxuCommand(command), { readOnly: false });
      await run(command);
      assert.equal(requests.at(-1)?.body.messageText, command);
      assert.equal(requests.at(-1)?.body.channelId, isPrivate ? undefined : 'lingxu-group');
      assert.deepEqual(requests.at(-1)?.body.groupTarget, isPrivate ? undefined : groupTarget);
      assert.ok(requests.at(-1)?.idempotencyKey);
    }
    const count = requests.length;
    const invalid = await run(`${settings} 回显占位词`);
    assert.doesNotMatch(invalid.text, /回显占位词/);
    assert.ok(invalid.commands.every(command => !command.includes('回显占位词')));
    assert.equal(requests.length, count);
  }
  const channel = app.events.channelMessage({ text: settings, platform: 'qq-bot', botId: groupTarget.BotId, channelId: 'lingxu-channel' });
  const view = delivery(await app.runHandler(handler, channel));
  assert.equal(requests.at(-1)?.body.channelId, 'lingxu-channel');
  assert.equal(requests.at(-1)?.body.groupTarget, undefined);
  assert.ok(!view.commands.includes(`${settings} 本群`));
});

test('other package messages continue the event chain', async t => {
  const { app, requests } = await gameFixture(t, () => undefined);
  for (const text of ['/灵墟洞天外', '/阵法师傅', '/其他包', '今天去哪里', '/激活阵盘 隐息阵盘']) {
    for (const event of [app.events.privateMessage({ text, platform: 'qq-bot' }), app.events.groupMessage({ text, platform: 'qq-bot' })]) {
      const result = await app.runHandler(handler, event);
      assert.equal(result.nextCalls.length, 1);
      assert.equal(result.messages.length, 0);
    }
  }
  assert.equal(requests.length, 0);
});

test('unknown free text and truncated or cross-domain references are never echoed or submitted', async t => {
  const { app, requests } = await gameFixture(t, () => undefined);
  for (const text of ['/灵墟洞天 回显占位词', '/阵法师 装备 回显占位词', `/灵墟洞天 确认 ${lingxuRef.slice(0, -1)}`, `/灵墟洞天 确认 ${lingxuRef.replace('_lx_', '_a_')}`]) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    const view = delivery(result);
    assert.doesNotMatch(view.text, /回显占位词|r1_/);
    assert.ok(view.commands.every(command => !command.includes('回显占位词') && !command.includes('r1_')));
    assert.match(view.text, /参数不正确/);
  }
  assert.equal(requests.length, 0);
});

test('confirmation retries preserve the original ref and original message idempotency key', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'private SQL 回显占位词' }), 500);
  for (const domain of ['灵墟洞天', '阵法师']) {
    const command = `/${domain} 确认 ${lingxuRef}`;
    const event = app.events.privateMessage({ text: command, platform: 'qq-bot', messageId: `${domain}-stable-confirmation` });
    for (let i = 0; i < 2; i++) {
      const view = delivery(await app.runHandler(handler, event));
      assert.ok(view.commands.includes(command));
      assert.doesNotMatch(view.text, /private SQL|回显占位词/);
      assert.ok(!view.commands.some(value => value.includes('预览')));
    }
    assert.equal(requests.at(-1)?.idempotencyKey, requests.at(-2)?.idempotencyKey);
    assert.ok(requests.at(-1)?.idempotencyKey);
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
  assert.equal(requests.length, 4);
});

test('one original reference can be sent only with current actor identity; no local authority cache', async t => {
  const { app, requests } = await gameFixture(t, request => request.bid === 'ref-owner' ? businessEnvelope(request.bid, lingxuPages[0].page) : ({ code: 'FORBIDDEN', message: '确认不属于当前角色' }), request => request.bid === 'ref-owner' ? 200 : 403);
  const command = `/灵墟洞天 确认 ${lingxuRef}`;
  const owner = delivery(await app.runHandler(handler, app.events.groupMessage({ text: command, groupId: 'ref-group', channelId: 'ref-group', userId: 'ref-owner', platform: 'qq-bot' })));
  assert.match(owner.text, /命数：4\/5/);
  const other = delivery(await app.runHandler(handler, app.events.groupMessage({ text: command, groupId: 'ref-group', channelId: 'ref-group', userId: 'ref-other', platform: 'qq-bot' })));
  assert.doesNotMatch(other.text, /命数：4\/5/);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(request => request.bid), ['ref-owner', 'ref-other']);
  assert.deepEqual(requests.map(request => request.body.channelId), ['ref-group', 'ref-group']);
});

test('a maximum legal short ref, holding and UID fit the complete 80-character budget', () => {
  const ref = `r1_${'z'.repeat(13)}_lx_${'z'.repeat(13)}_${'a'.repeat(24)}`;
  assert.ok(validLingxuReference(ref));
  for (const command of [`/灵墟洞天 确认 ${ref}`, `/灵墟洞天 保护 ${'h'.repeat(32)} 1000000`, '/灵墟洞天 对人 9223372036854775807 战斗']) {
    assert.ok([...command].length <= 80);
    const parsed = parseLingxuCommand(command);
    assert.ok(parsed && !('error' in parsed));
  }
  assert.deepEqual(parseLingxuCommand('/灵墟洞天 对人 9223372036854775808 战斗'), { error: true });
  const full = `/灵墟洞天 确认 ${ref}`;
  assert.equal([...commandText(full, '！'.repeat(14))].length, 80);
  assert.ok(commandText(full, '！'.repeat(14)).endsWith(ref));
  assert.throws(() => commandText(full, '！'.repeat(15)), /80/);
});

test('all MVP fixed options have explicit read/write classification', () => {
  const read = ['/灵墟洞天 入场', '/灵墟洞天 简介', '/灵墟洞天 玩法', '/灵墟洞天 入门', '/灵墟洞天 行动倾向', '/灵墟洞天 倾向', '/灵墟洞天 对人 123', '/灵墟洞天 返程设置', '/灵墟洞天 保护 lot_1', '/灵墟洞天 扩容预览', '/灵墟洞天 行囊升级', '/阵法师', '/阵法师 图谱', '/阵法师 阵盘 2', '/阵法师 制盘预览 guixu', '/阵法师 装备 disc_1', '/阵法师 卸下', '/阵法师 终止预览'];
  const write = ['/灵墟洞天 倾向 行动 激进', '/灵墟洞天 倾向 对人 躲避', '/灵墟洞天 倾向 对怪 友善', '/灵墟洞天 对人 123 默认', '/灵墟洞天 返程设置 时长 60', '/灵墟洞天 返程设置 格数 40', '/灵墟洞天 返程设置 关闭', '/灵墟洞天 前往 废弃坊市', '/灵墟洞天 撤离 震门', '/灵墟洞天 隐匿', '/灵墟洞天 继续', '/灵墟洞天 保护 21 1', '/阵法师 入门'];
  for (const command of read) assert.deepEqual(parseLingxuCommand(command), { readOnly: true }, command);
  for (const command of write) assert.deepEqual(parseLingxuCommand(command), { readOnly: false }, command);
});

test('readable destinations and legacy keys are forwarded for server validation', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, lingxuPages[0].page));
  const valid = ['/灵墟洞天 前往 废弃坊市', '/灵墟洞天 前往 坤·阴·龙脉石窟', '/灵墟洞天 撤离 坤门', '/灵墟洞天 前往 kun_inner', `/灵墟洞天 撤离 ${'a'.repeat(24)}`, '/灵墟洞天 返程设置 时长 10081', '/灵墟洞天 返程设置 格数 101'];
  for (const command of valid) {
    assert.deepEqual(parseLingxuCommand(command), { readOnly: false });
    delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
  const invalid = ['/灵墟洞天 前往 ../core', '/灵墟洞天 撤离 回显占位词！', `/灵墟洞天 撤离 ${'a'.repeat(25)}`, '/灵墟洞天 返程设置 时长 0', '/灵墟洞天 返程设置 格数 1.5', '/灵墟洞天 返程设置 时长 9007199254740992', '/灵墟洞天 返程设置 物品 herb:1'];
  for (const command of invalid) {
    assert.deepEqual(parseLingxuCommand(command), { error: true });
    const view = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.match(view.text, /参数不正确/);
    assert.doesNotMatch(view.text, /回显占位词|\.\.\/core/);
  }
  assert.equal(requests.length, valid.length);
  assert.deepEqual(parseLingxuCommand('/灵墟洞天 拾取'), { readOnly: true });
});

test('formation grades and twelve-hour activation are previews, including legacy equip and remove commands', async t => {
  const page = { title: '阵法师 · 激活预览', privateOnly: true, sections: [{ lines: ['目标：道蕴阵盘·三品 #31', '时效：确认后立即生效12小时，同路线刷新期限不累加，其他路线覆盖不返还。', '消耗：一件真实成品；预览尚未消耗。'], actions: [{ label: '确认激活', command: `/阵法师 确认 ${lingxuRef}` }] }], actions: [{ label: '取消', command: '/阵法师 阵盘' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, page));
  for (const command of ['/阵法师 路线 道蕴', '/阵法师 制盘预览 神行', '/阵法师 升级预览 31', '/阵法师 升级预览 31 最高', '/阵法师 激活预览 31', '/阵法师 装备 d1', '/阵法师 终止预览', '/阵法师 卸下']) {
    assert.deepEqual(parseLingxuCommand(command), { readOnly: true });
    const view = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.match(view.text, /预览尚未消耗/);
    assert.equal(requests.at(-1)?.body.messageText, command);
    assert.deepEqual(requests.at(-1)?.body.arguments, {});
  }
});

test('the bag discard shortcut only previews and confirmation keeps the original operation', async t => {
  const holding = '/灵墟洞天 丢弃 21';
  const multi = `${holding} 3`;
  const confirm = `/灵墟洞天 确认 ${lingxuRef}`;
  const previewPage = (count: number) => ({
    title: '灵墟洞天 · 确认丢弃',
    sections: [{ lines: [`物品：青岚灵芽×${count}`, '损失：确认后永久消失，无法找回，也不会成为地图掉落。'], actions: [{ label: '确认永久丢弃', command: confirm }] }],
    actions: [{ label: '取消', command: '/灵墟洞天 行囊' }]
  });
  const pages = new Map<string, Omit<LingxuPage, 'privateOnly'>>([
    ['/灵墟洞天 行囊', { title: '灵墟洞天 · 墟行囊', sections: [{ title: '青岚灵芽', lines: ['数量：3'], actions: [{ label: '丢弃', command: holding }] }] }],
    [holding, previewPage(1)],
    [multi, previewPage(3)],
    [confirm, { title: '灵墟洞天 · 丢弃回执', sections: [{ lines: ['结果：已永久丢弃青岚灵芽×3'] }] }]
  ]);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { privateOnly: false, ...pages.get(String(request.body.messageText)) }));
  const run = (command: string) => app.runHandler(handler, app.events.groupMessage({ text: command, platform: 'qq-bot', userId: 'lingxu-member' }));
  const bag = await run('/灵墟洞天 行囊');
  delivery(bag);
  const quote = nodes(bag.messages[0].nodes).find(node => node.type === 'MD.blockquote');
  const row = (quote?.value as Node[]).filter(node => node.type !== 'MD.text' || String(node.value).trim());
  assert.deepEqual(row.slice(0, 2).map(node => [node.type, node.value]), [['MD.bold', '青岚灵芽'], ['MD.button', '‹丢弃›']]);
  assert.equal(row[1].options?.data, holding);
  const single = delivery(await run(String(row[1].options?.data)));
  assert.match(single.text, /青岚灵芽×1/);
  const warning = delivery(await run(multi));
  assert.match(warning.text, /青岚灵芽×3/);
  assert.match(warning.text, /永久消失/);
  assert.ok(warning.commands.includes(confirm));
  assert.ok(warning.commands.includes('/灵墟洞天 行囊'));
  assert.deepEqual(requests.map(request => request.body.messageText), ['/灵墟洞天 行囊', holding, multi]);
  assert.match(delivery(await run(confirm)).text, /已永久丢弃青岚灵芽×3/);
  assert.equal(requests.at(-1)?.body.messageText, confirm);
  for (const cmd of [holding, multi, `${holding} 1000000`]) assert.deepEqual(parseLingxuCommand(cmd), { readOnly: true });
  for (const cmd of [`${holding} 0`, `${holding} 1000001`, `${holding} 全部`, '/灵墟洞天 丢弃 ../h1']) assert.deepEqual(parseLingxuCommand(cmd), { error: true });
});

test('malformed pages, oversize commands, invalid navigation and action overload fail closed', async t => {
  const base = lingxuPages[0].page;
  const bad = [{ ...base, privateOnly: 'false' }, { ...base, sections: null }, { ...base, sections: [{ lines: [], actions: [{ label: '未知', command: '/灵墟洞天 回显占位词' }] }] }, { ...base, nav: { page: 1, totalPages: 2, command: '/灵墟洞天 回显占位词 {page}' } }, { ...base, actions: Array.from({ length: 9 }, () => ({ label: '返回', command: '/灵墟洞天' })) }, { ...base, sections: [{ lines: [], actions: [{ label: '过长', command: `/灵墟洞天 确认 ${'x'.repeat(75)}` }] }] }];
  for (const value of bad) assert.throws(() => parseLingxuPage(value));
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, bad[0]));
  assert.match(delivery(await app.runHandler(handler, app.events.privateMessage({ text: '/灵墟洞天', platform: 'qq-bot' }))).text, /未获完整确认/);
});

test('life zero, post-defeat, protected bag and extraction receipt preserve authoritative text', async t => {
  const states = [
    ['状态：暂停，待20:00恢复1点命数后继续', '命数：0/5'],
    ['结果：战败，命数-1，已转移至相邻合法地域', '说明：下一场战斗满血开始'],
    ['状态：已保护 · 安全格1/1', '说明：保护物品不会掉落'],
    ['结果：本局已安全撤离', '到账：青岚灵芽×2 · 原回执，不再重复领取']
  ];
  for (const lines of states) {
    const page = { title: '灵墟洞天 · 回执', privateOnly: true, sections: [{ lines }], actions: [{ label: '返回洞天', command: '/灵墟洞天' }] };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, page));
    const view = delivery(await app.runHandler(handler, app.events.privateMessage({ text: '/灵墟洞天 提取回执', platform: 'qq-bot' })));
    for (const line of lines) assert.ok(view.text.includes(line));
    assert.doesNotMatch(view.text, /血量|虚弱|治疗/);
  }
});

test('both root routes dispatch full confirmation commands in group and private through real framework router', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...lingxuPages[0].page, privateOnly: !request.body.channelId }));
  await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
  for (const domain of ['灵墟洞天', '阵法师']) {
    const command = `/${domain} 确认 ${lingxuRef}`;
    const options = { text: command, platform: 'qq-bot', userId: 'confirmed-member' };
    const events = [app.events.privateMessage(options), app.events.groupMessage({ ...options, groupId: 'confirm-group', channelId: 'confirm-group' })];
    for (const event of events) {
      const result = await app.dispatch(event);
      delivery(result);
      const groupId = event.name === 'message.create' ? event.ChannelId : undefined;
      assert.equal(result.messages[0].target?.targetId, groupId ?? event.UserId);
      assert.equal(requests.at(-1)?.bid, event.UserId);
      assert.equal(requests.at(-1)?.body.channelId, groupId);
      assert.equal(requests.at(-1)?.body.messageText, command);
      assert.ok(requests.at(-1)?.idempotencyKey);
    }
  }
});

test('activity hall makes the new cave discoverable without replacing existing games', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/online-encounter.check')
    ? { triggered: false, pending: null, nextCheckAt: '2099-01-01T00:00:00Z', nextGameDayAt: '2099-01-02T00:00:00Z', quotaExhausted: false }
    : { limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' }, guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 }, access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: false, giftCodesVisible: false }));
  const result = await app.runHandler(activity, app.events.privateMessage({ text: '/我的活动', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  const sent = result.messages[0];
  for (const command of ['/灵墟洞天', '/成就', '/上古遗珍']) assert.ok(sent.commands.includes(command));
  assert.equal(requests.filter(request => request.path.endsWith('/activity.hub')).length, 1);
  assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('profession overview exposes formation profession without inventing its enrollment state', async t => {
  const data = {
    access: { canUseProfessionAndCave: true, canJoinAlchemyGuide: false, features: {} },
    alchemy: { unlocked: false, title: '', level: 0, exp: 0, nextExpRequired: null, totalCrafts: 0, learnedRecipeCount: 0, canAdvance: false, showSection: false, primaryAction: 'none', guide: { active: false, step: null, expiresAt: null, stepLabel: '' }, equipments: [] },
    lingzhi: { unlocked: false, title: '', level: 0, exp: 0, nextExpRequired: null, dailyExpGained: 0, dailyExpCap: 0, maxPlots: 0, maxFieldGrade: 0, maxFieldGradeLabel: '', yieldBonus: 0, primaryAction: 'joinGuide' }
  };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(profession, app.events.privateMessage({ text: '/我的职业', platform: 'qq-bot' }));
  const view = delivery(result);
  assert.ok(view.commands.includes('/阵法师'));
  assert.match(view.text, /可在阵法师页面免费入门/);
  assert.doesNotMatch(view.text, /已入门阵法师|免费获得阵盘/);
  assert.equal(requests.length, 1);
});

test('formation market filter sends its real category and shows original effect without a fake item-detail command', async t => {
  const item = { listingId: 51, sellerUserId: 2, sellerName: '清霜', itemCategory: 'formation_disc', itemCategoryLabel: '阵盘', itemType: null, itemSubtype: null, templateItemId: 14, itemName: '道蕴阵盘（四品）', quantity: 1, unitPriceAmount: 200, currencyCode: 'SPIRIT_CRYSTAL', currencyName: '灵晶', canPurchase: true, purchaseUnavailableReason: null, upgradeHint: '', attributeAvailable: true, attributes: null, attributeView: { attrText: '四品累计效果：双攻+3%；激活消耗成品，立即生效12小时', hidden: false }, createdAt: '2026-11-11T09:00:00+08:00', expiresAt: null };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { view: 'browse', spiritsCrystal: 500, quota: { dailyLimit: 10, dailyUsed: 0, remaining: 10 }, items: [item], pagination: { currentPage: 1, totalPages: 1, total: 1 } }));
  const result = await app.runHandler(marketBrowse, app.events.privateMessage({ text: '/珍宝楼 筛选 阵盘', platform: 'qq-bot' }));
  const sent = result.messages[0];
  assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.equal((requests[0].body.arguments as Record<string, unknown>).categoryType, 'formation_disc');
  assert.ok(sent.text.includes(item.attributeView.attrText));
  assert.ok(sent.commands.includes('/选购 51'));
  assert.ok(!sent.commands.some(command => command.startsWith('/物品详情 阵盘')));
  for (const button of nodes(sent.nodes).filter(node => node.type === 'MD.button')) assert.equal(button.options?.autoEnter, false);
});

test('formation market listing uses actual instance ID and the original fixed-quantity price flow', async t => {
  const range = { minPrice: 2, maxPrice: 99999999, referencePrice: 0, source: 'fallback', credibilityReady: true, templateItemId: 14, maxListingQuantity: 1, fixedQuantity: true };
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as Record<string, unknown>;
    return businessEnvelope(request.bid, args.mode === 'choose' ? { mode: 'choose' } : args.mode === 'list'
      ? { mode: 'list', items: [{ category: 'formation_disc', userItemId: 31, templateId: 14, name: '道蕴阵盘（四品）', quantity: 1, grade: '四品', realm: '不限境界', typeName: '阵盘', config: { discKey: 'formation.disc.daoyun', effect: '双攻+3%；原洞天完整效果' }, priceRange: range, currentLowestPrice: null }], total: 1, currentPage: 1, pageSize: 10, totalPages: 1 }
      : { mode: 'start', range, ...(args.firstNumber === null ? {} : { message: '上架成功：道蕴阵盘×1，单价200灵晶', listingId: 51 }) });
  });
  const run = async (text: string) => {
    const result = await app.runHandler(marketSell, app.events.privateMessage({ text, platform: 'qq-bot' }));
    const sent = result.messages[0];
    assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
    for (const button of nodes(sent.nodes).filter(node => node.type === 'MD.button')) assert.equal(button.options?.autoEnter, false);
    return sent;
  };
  assert.ok((await run('/交易上架')).commands.includes('/交易上架 阵盘'));
  const listed = await run('/交易上架 阵盘');
  assert.match(listed.text, /道蕴阵盘（四品） #31/);
  assert.ok(listed.commands.includes('/交易上架 阵盘 31'));
  assert.ok(listed.text.includes('双攻+3%；原洞天完整效果'));
  const choosePrice = await run('/交易上架 阵盘 31');
  assert.ok(choosePrice.commands.includes('/交易上架 阵盘 31 2'));
  await run('/交易上架 阵盘 31 200');
  assert.deepEqual(requests.at(-1)?.body.arguments, { mode: 'start', category: 'formation_disc', userItemId: 31, firstNumber: 200, secondNumber: null });
});

test('actual Go page-builder JSON passes the QQ parser and real handler', { skip: process.env.XIUXIAN_LINGXU_CONTRACT_FIXTURE ? false : 'Set XIUXIAN_LINGXU_CONTRACT_FIXTURE to the Go HTTP test export' }, async t => {
  const samples = JSON.parse(readFileSync(process.env.XIUXIAN_LINGXU_CONTRACT_FIXTURE!, 'utf8')) as Array<{ command: string; page: unknown }>;
  assert.ok(samples.length >= 17);
  for (const sample of samples) {
    const page = parseLingxuPage(sample.page);
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, sample.page));
    const options = { text: sample.command, platform: 'qq-bot' };
    const events = [app.events.privateMessage(options), app.events.groupMessage(options)];
    for (const event of events) {
      const result = await app.runHandler(handler, event);
      const view = delivery(result, page.tabs ? 13 : 10);
      assert.ok(view.text.includes(page.title));
      for (const action of [...(page.tabs ?? []), ...(page.actions ?? []), ...page.sections.flatMap(section => section.actions ?? [])]) assert.ok(view.commands.includes(action.command));
      assert.equal(requests.at(-1)?.body.messageText, sample.command);
      assert.equal(result.messages[0].target?.targetId, event.name === 'message.create' ? event.ChannelId : event.UserId);
    }
  }
});
