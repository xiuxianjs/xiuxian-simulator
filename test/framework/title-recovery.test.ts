import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import overview from '../../src/response/title/myTitles/res';
import activate from '../../src/response/title/activateTitle/res';
import deactivate from '../../src/response/title/deactivateTitle/res';
import claim from '../../src/response/killGodList/claimTitle/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: overview, command: '/我的称号', operation: 'titles.overview', args: {}, fallback: '查询称号失败' },
  { handler: activate, command: '/佩戴称号 101', operation: 'titles.activate', args: { titleId: 101 }, fallback: '佩戴称号失败' },
  { handler: deactivate, command: '/卸下称号', operation: 'titles.deactivate', args: {}, fallback: '卸下称号失败' },
  { handler: claim, command: '/领取杀神称号', operation: 'pvp.kill-god-title-claim', args: {}, fallback: '领取失败' }
];
const cases = [
  { ...entries[0], reason: '称号服务尚未配置', expected: '/我的信息', detail: '不能判断称号已失去' },
  { ...entries[1], reason: 'record not found', expected: '/我的称号', detail: '不是展示序号或称号模板ID' },
  { ...entries[1], reason: '称号不存在或已过期', expected: '/我的称号', detail: '过期或不属于本人的记录不能佩戴' },
  { ...entries[1], reason: '操作繁忙，请稍后重试', expected: '/我的称号', detail: '状态可能已经写入' },
  { ...entries[2], reason: '状态更新未获确认', expected: '/我的称号', detail: '不自动重试或认定原佩戴仍在' },
  { ...entries[3], reason: '你已持有「杀神」称号。', expected: '/我的称号', detail: '领取不会自动佩戴' },
  { ...entries[3], reason: '杀神榜当前上榜人数不足 10 人，暂不开放领取。', expected: '/杀神榜', detail: '人数和榜一条件都需满足' },
  { ...entries[3], reason: '仅杀神榜榜一可领取此称号。', expected: '/杀神榜', detail: '不自动发起战斗或重复领取' },
  { ...entries[3], reason: '称号尚未配置，请联系管理员。', expected: '/我的称号', detail: '提高排名不能补齐称号配置' },
  { ...entries[3], reason: '领取失败，请稍后再试。\n\n重复提醒', expected: '/我的称号', detail: '请求未获确认时先查看结果' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '称号', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason), view.text);
    assert.ok(view.text.includes(entry.detail), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(佩戴称号|打劫)\s/.test(command)));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const command of ['/佩戴称号', '/佩戴称号 0', '/佩戴称号 -1', '/佩戴称号 101尾字', '/佩戴称号 101.5', '/佩戴称号 9007199254740992']) for (const isPrivate of [false, true]) {
  test(`佩戴称号 invalid selector makes no request ${command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('Invalid input must not reach backend'); });
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(activate, event);
    assert.equal(requests.length, 0);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes('请指定本人持有称号的记录ID'));
    assert.ok(view.text.includes('不是展示序号或称号模板ID'));
    assert.ok(view.commands.includes('/我的称号'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} malformed receipt preserves unknown result private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.fallback), view.text);
    assert.ok(view.commands.includes(entry.handler === overview ? '/我的信息' : '/我的称号'));
    if (entry.handler === activate || entry.handler === deactivate) assert.ok(view.text.includes('状态可能已经写入'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`empty valid title list explains acquisition without claiming private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { moodText: '原心情', titles: [] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/我的称号', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的称号', platform: 'qq-bot' });
    const result = await app.runHandler(overview, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原心情', '当前没有可用的有效称号', '没有有效称号不代表从未获得过称号']) assert.ok(view.text.includes(text));
    for (const command of ['/我的师门', '/杀神榜']) assert.ok(view.commands.includes(command));
    assert.ok(!view.commands.includes('/领取师门称号'));
    assert.ok(!view.commands.includes('/领取杀神称号'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { ...entries[1], data: { id: 101, title: '青云', isActive: true }, expected: '已佩戴称号「青云」' },
  { ...entries[2], data: { removed: true }, expected: '已卸下称号' },
  { ...entries[2], data: { removed: false }, expected: '当前没有佩戴称号' },
  { ...entries[3], data: { code: 'OK', title: '杀神' }, expected: '已获得称号「杀神」' }
]) for (const isPrivate of [false, true]) {
  test(`${entry.command} authoritative outcome ${entry.expected} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(entry.expected), view.text);
    assert.ok(view.commands.includes('/我的称号'));
    if (entry.data && 'removed' in entry.data && !entry.data.removed) assert.ok(view.text.includes('无需重复卸下'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`owned title action uses owned row ID and stays with quote private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      moodText: '原心情', titles: [{ id: 101, title: '青云', isActive: false, description: '原描述', bonusSummary: '物攻+8', expireDate: '2026/12/1', actionLabel: '佩戴', actionCommand: '/佩戴称号 101' }]
    }));
    const event = isPrivate ? app.events.privateMessage({ text: '/我的称号', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的称号', platform: 'qq-bot' });
    const result = await app.runHandler(overview, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /到期：2026-12-01/);
    assert.doesNotMatch(view.text, /2026\/12\/1/);
    assert.equal(requests.length, 1);
    for (const text of ['【1】青云', '原描述', '物攻+8', '2026-12-01']) assert.ok(view.text.includes(text));
    assert.ok(view.commands.includes('/佩戴称号 101'));
    assert.ok(!view.commands.includes('/佩戴称号 1'));
    const quotes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
    assert.ok(quotes.some(quote => {
      if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) return false;
      const item = inspectMessage([{ type: 'Markdown', value: quote.value }]);
      return item.text.includes('【1】青云') && item.commands.includes('/佩戴称号 101');
    }));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`kill-god claim retains existing server advice and blocks private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '原题', heading: '原标题', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的境界', description: '原建议' }], buttons: [{ label: '原入口', command: '/我的信息' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/领取杀神称号', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/领取杀神称号', platform: 'qq-bot' });
    const result = await app.runHandler(claim, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的境界', '/我的信息', '/我的称号', '/杀神榜']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} unavailable transport preserves fallback and query private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'UNAVAILABLE', message: '称号服务尚未配置' }), 503);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.fallback), view.text);
    assert.ok(view.commands.includes(entry.handler === overview ? '/我的信息' : '/我的称号'));
    if (entry.handler === activate || entry.handler === deactivate) assert.ok(view.text.includes('状态可能已经写入'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
