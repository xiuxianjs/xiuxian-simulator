import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { parseLingxuPage } from '../../src/api/bot/lingxu';
import { parseLingxuCommand, validLingxuReference } from '../../src/response/lingxu/commands';
import handler from '../../src/response/lingxu/res';
import activity from '../../src/response/activity/res';
import profession from '../../src/response/profession/myProfession/res';
import { businessEnvelope, gameFixture } from './fixture';
import { lingxuPages, lingxuRef } from './lingxu-minimal-fixtures';

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

for (const entry of lingxuPages) test(`minimal lingxu actual handler: ${entry.command}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.page));
  const event = app.events.privateMessage({ text: entry.command, platform: 'qq-bot' });
  const result = await app.runHandler(handler, event);
  const view = delivery(result);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/lingxu.command'));
  assert.deepEqual(requests[0].body.arguments, {});
  assert.equal(requests[0].body.messageText, entry.command);
  for (const expected of entry.expected) assert.ok(view.text.includes(expected), view.text);
  assert.equal(result.messages[0].target?.targetId, event.UserId);
  assert.equal(result.nextCalls.length, 0);
});

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

test('each private-only entry in a group gives the fixed private handoff with no backend call', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('Group must not query private state'); });
  for (const entry of lingxuPages) {
    const result = await app.runHandler(handler, app.events.groupMessage({ text: entry.command, platform: 'qq-bot' }));
    assert.match(delivery(result).text, /只在私聊中展示/);
    assert.equal(result.nextCalls.length, 0);
  }
  assert.equal(requests.length, 0);
});

test('other package messages continue the event chain', async t => {
  const { app, requests } = await gameFixture(t, () => undefined);
  for (const text of ['/灵墟洞天外', '/阵法师傅', '/其他包', '今天去哪里', '/激活阵盘 隐息阵盘']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.nextCalls.length, 1);
    assert.equal(result.messages.length, 0);
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
  const owner = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, userId: 'ref-owner', platform: 'qq-bot' })));
  assert.match(owner.text, /生命点：4\/5/);
  const other = delivery(await app.runHandler(handler, app.events.privateMessage({ text: command, userId: 'ref-other', platform: 'qq-bot' })));
  assert.doesNotMatch(other.text, /生命点：4\/5/);
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].bid, requests[1].bid);
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
});

test('all MVP fixed options have explicit read/write classification', () => {
  const read = ['/灵墟洞天 入场', '/灵墟洞天 倾向', '/灵墟洞天 对人 123', '/灵墟洞天 返程设置', '/灵墟洞天 保护 lot_1', '/灵墟洞天 扩容预览', '/灵墟洞天 行囊升级', '/阵法师', '/阵法师 图谱', '/阵法师 阵盘 2', '/阵法师 制盘预览 guixu'];
  const write = ['/灵墟洞天 倾向 行动 激进', '/灵墟洞天 倾向 对人 躲避', '/灵墟洞天 倾向 对怪 友善', '/灵墟洞天 对人 123 默认', '/灵墟洞天 返程设置 时长 60', '/灵墟洞天 返程设置 格数 40', '/灵墟洞天 返程设置 物品 herb:1', '/灵墟洞天 返程设置 关闭', '/灵墟洞天 前往 kun', '/灵墟洞天 撤离 zhen', '/灵墟洞天 隐匿', '/灵墟洞天 继续', '/灵墟洞天 保护 lot_1 1', '/阵法师 入门', '/阵法师 装备 disc_1'];
  for (const command of read) assert.deepEqual(parseLingxuCommand(command), { readOnly: true }, command);
  for (const command of write) assert.deepEqual(parseLingxuCommand(command), { readOnly: false }, command);
});

test('malformed pages, oversize commands, invalid navigation and action overload fail closed', async t => {
  const base = lingxuPages[0].page;
  const bad = [{ ...base, privateOnly: false }, { ...base, sections: null }, { ...base, sections: [{ lines: [], actions: [{ label: '未知', command: '/灵墟洞天 回显占位词' }] }] }, { ...base, nav: { page: 1, totalPages: 2, command: '/灵墟洞天 回显占位词 {page}' } }, { ...base, actions: Array.from({ length: 9 }, () => ({ label: '返回', command: '/灵墟洞天' })) }, { ...base, sections: [{ lines: [], actions: [{ label: '过长', command: `/灵墟洞天 确认 ${'x'.repeat(75)}` }] }] }];
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

test('both root routes dispatch full confirmation commands through real framework router', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, lingxuPages[0].page));
  const router = Router.create({ events: ['message.create', 'private.message.create'] });
  router.use(['灵墟洞天', '阵法师'], async () => ({ default: handler }));
  await app.mount({ responseRouter: router.define });
  for (const domain of ['灵墟洞天', '阵法师']) {
    const command = `/${domain} 确认 ${lingxuRef}`;
    delivery(await app.dispatch(app.events.privateMessage({ text: command, platform: 'qq-bot' })));
    assert.equal(requests.at(-1)?.body.messageText, command);
  }
});

test('activity hall makes the new private cave discoverable without replacing existing games', async t => {
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
