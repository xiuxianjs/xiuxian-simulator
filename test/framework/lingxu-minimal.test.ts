import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseLingxuPage } from '../../src/api/bot/lingxu';
import { parseLingxuCommand, validLingxuReference } from '../../src/response/lingxu/commands';
import handler from '../../src/response/lingxu/res';
import activity from '../../src/response/activity/res';
import profession from '../../src/response/profession/myProfession/res';
import marketBrowse from '../../src/response/market/list/res';
import marketSell from '../../src/response/market/sell/res';
import { businessEnvelope, gameFixture } from './fixture';
import { lingxuPages, lingxuRef } from './lingxu-minimal-fixtures';
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
function delivery(result: TestRunResult) {
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
  assert.ok(buttons.length <= 10);
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
  assert.match(owner.text, /生命点：4\/5/);
  const other = delivery(await app.runHandler(handler, app.events.groupMessage({ text: command, groupId: 'ref-group', channelId: 'ref-group', userId: 'ref-other', platform: 'qq-bot' })));
  assert.doesNotMatch(other.text, /生命点：4\/5/);
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
  const read = ['/灵墟洞天 入场', '/灵墟洞天 倾向', '/灵墟洞天 对人 123', '/灵墟洞天 返程设置', '/灵墟洞天 保护 lot_1', '/灵墟洞天 扩容预览', '/灵墟洞天 行囊升级', '/阵法师', '/阵法师 图谱', '/阵法师 阵盘 2', '/阵法师 制盘预览 guixu', '/阵法师 装备 disc_1', '/阵法师 卸下', '/阵法师 终止预览'];
  const write = ['/灵墟洞天 倾向 行动 激进', '/灵墟洞天 倾向 对人 躲避', '/灵墟洞天 倾向 对怪 友善', '/灵墟洞天 对人 123 默认', '/灵墟洞天 返程设置 时长 60', '/灵墟洞天 返程设置 格数 40', '/灵墟洞天 返程设置 物品 herb:1', '/灵墟洞天 返程设置 关闭', '/灵墟洞天 前往 kun', '/灵墟洞天 撤离 zhen', '/灵墟洞天 隐匿', '/灵墟洞天 继续', '/灵墟洞天 保护 lot_1 1', '/阵法师 入门'];
  for (const command of read) assert.deepEqual(parseLingxuCommand(command), { readOnly: true }, command);
  for (const command of write) assert.deepEqual(parseLingxuCommand(command), { readOnly: false }, command);
});

test('valid map keys and return values are forwarded for server validation', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, lingxuPages[0].page));
  const valid = ['/灵墟洞天 前往 kun_inner', '/灵墟洞天 前往 new_region-2', '/灵墟洞天 撤离 core', `/灵墟洞天 撤离 ${'a'.repeat(24)}`, '/灵墟洞天 返程设置 时长 10081', '/灵墟洞天 返程设置 格数 101'];
  for (const command of valid) {
    assert.deepEqual(parseLingxuCommand(command), { readOnly: false });
    delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
  const invalid = ['/灵墟洞天 前往 ../core', '/灵墟洞天 撤离 回显占位词', `/灵墟洞天 撤离 ${'a'.repeat(25)}`, '/灵墟洞天 返程设置 时长 0', '/灵墟洞天 返程设置 格数 1.5', '/灵墟洞天 返程设置 时长 9007199254740992'];
  for (const command of invalid) {
    assert.deepEqual(parseLingxuCommand(command), { error: true });
    const view = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.match(view.text, /参数不正确/);
    assert.doesNotMatch(view.text, /回显占位词|\.\.\/core/);
  }
  assert.equal(requests.length, valid.length);
  assert.deepEqual(parseLingxuCommand('/灵墟洞天 拾取'), { readOnly: false });
});

test('formation grades and twelve-hour activation are previews, including legacy equip and remove commands', async t => {
  const page = { title: '阵法师 · 激活预览', privateOnly: true, sections: [{ lines: ['目标：道蕴阵盘·三品 #d1', '时效：确认后立即生效12小时，同路线刷新期限不累加，其他路线覆盖不返还。', '消耗：一件真实成品；预览尚未消耗。'], actions: [{ label: '确认激活', command: `/阵法师 确认 ${lingxuRef}` }] }], actions: [{ label: '取消', command: '/阵法师 阵盘' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, page));
  for (const command of ['/阵法师 路线 daoyun', '/阵法师 升级预览 d1', '/阵法师 升级预览 d1 最高', '/阵法师 激活预览 d1', '/阵法师 装备 d1', '/阵法师 终止预览', '/阵法师 卸下']) {
    assert.deepEqual(parseLingxuCommand(command), { readOnly: true });
    const view = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.match(view.text, /预览尚未消耗/);
    assert.equal(requests.at(-1)?.body.messageText, command);
    assert.deepEqual(requests.at(-1)?.body.arguments, {});
  }
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
    ['状态：暂停，待20:00恢复1生命点后继续', '生命点：0/5'],
    ['结果：战败，生命点-1；已转移至相邻合法地域', '说明：下一场战斗满血开始'],
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
      const view = delivery(result);
      assert.ok(view.text.includes(page.title));
      for (const action of [...(page.actions ?? []), ...page.sections.flatMap(section => section.actions ?? [])]) assert.ok(view.commands.includes(action.command));
      assert.equal(requests.at(-1)?.body.messageText, sample.command);
      assert.equal(result.messages[0].target?.targetId, event.name === 'message.create' ? event.ChannelId : event.UserId);
    }
  }
});
