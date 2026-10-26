import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import upgrade from '../../src/response/soulArtifact/upgrade/res';
import grade from '../../src/response/soulArtifact/gradeUp/res';
import unequip from '../../src/response/soulArtifact/unequip/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: upgrade, op: 'soul-artifacts.upgrade', command: '/本命物升级 5', args: { levels: '5' } },
  { handler: grade, op: 'soul-artifacts.grade-upgrade', command: '/本命物升品 2', args: { instanceId: '2' } },
  { handler: unequip, op: 'soul-artifacts.unequip', command: '/分离 确认', args: { confirmed: true } }
];
const writes = /^\/(?:本命物升级|本命物升品|分离|炼化本命物)(?:\s|$)/;
for (const entry of entries) for (const isPrivate of [false, true]) {
  for (const wire of ['http', 'feedback', 'malformed', 'internal', 'structured']) {
    test(`cultivation recovery ${entry.op} ${wire} private=${isPrivate}`, async t => {
      const reason = '原业务拒绝';
      const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: reason } : wire === 'internal' ? { code: 'INTERNAL', message: 'private commit failure' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: reason, quote: '原引用', blocks: [{ text: reason, quoted: false }, { text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我' }], advice: wire === 'structured' ? [{ command: '/本命物信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
      const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
      const result = await app.runHandler(entry.handler, event);
      const view = inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/'+entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey);
      if (wire === 'malformed' || wire === 'internal') assert.ok(view.text.includes(entry.handler === grade ? '暂未确认本次升品结果' : '结果未获完整确认'));
      else assert.ok(view.text.includes(reason));
      if (wire === 'structured' || wire === 'feedback') {
        for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text));
        for (const command of ['/我','/丹方']) assert.ok(view.commands.includes(command));
      }
      if (wire === 'structured') assert.ok(view.text.includes('原服务建议'));
      assert.ok((entry.handler === grade && (wire === 'malformed' || wire === 'internal')) ? view.text.includes('暂勿重复升品') : view.text.includes('不直接重放') || wire === 'structured');
      assert.ok(!view.text.includes('private commit'));
      assert.ok(view.commands.includes('/本命物信息'));
      assert.ok(!view.commands.some(command => writes.test(command)));
      assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
for (const isPrivate of [false, true]) for (const [entry, command] of [
  [entries[0], '/本命物升级 abc'], [entries[0], '/本命物升级 -1'], [entries[0], '/本命物升级 1.5'],
  [entries[1], '/本命物升品 abc'], [entries[1], '/本命物升品 2 abc'],
  [entries[2], '/分离 不确认'], [entries[2], '/分离 确认一下'], [entries[2], '/分离 abc']
] as const) {
  test(`invalid cultivation input never mutates ${command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('invalid input must not request'); });
    const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 0); assert.ok(view.text.includes('格式错误')); assert.ok(view.commands.includes('/本命物信息')); assert.ok(!view.commands.some(command => writes.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const upgraded = (levels: number) => ({ result: { artifact: { id: 9, name: '青莲', level: levels }, previousLevel: 0, actualLevels: levels, cost: levels*100, comparison: [{ key: 'patk', before: 1, after: 3 }], compareLines: ['物攻 1 → 3'], message: '升级结算' }, message: `已升级 ${levels} 级` });
for (const levels of [2,5]) {
  test(`upgrade actual settlement ${levels} of requested 5`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, upgraded(levels)));
    const result = await app.runHandler(upgrade, app.events.privateMessage({ text: '/本命物升级 5', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1); assert.ok(view.text.includes(`已升级 ${levels} 级`)); assert.ok(view.text.includes('物攻 1 → 3'));
    assert.equal(view.commands.includes('/本命物升级 5'), levels === 5);
    if (levels === 2) { assert.ok(view.text.includes('未完成全部请求等级')); assert.ok(view.commands.includes('/储物袋 材料 其它')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const confirmed of [false,true,'compact'] as const) {
  test(`exact unequip confirmation preserves server semantics ${confirmed}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: confirmed ? 'done' : 'confirmation', message: confirmed ? '分离成功，返还筑灵石300' : '', result: { outcome: confirmed ? 'unequipped' : 'confirmation', artifact: { name: '青莲', previousLevel: 5, totalCost: 500, refundQuantity: 300 } } }));
    const result = await app.runHandler(unequip, app.events.groupMessage({ text: confirmed === 'compact' ? '/分离确认' : confirmed ? '/分离 确认' : '/分离', platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { confirmed: Boolean(confirmed) });
    if (!confirmed) { assert.ok(view.text.includes('60%')); assert.ok(view.text.includes('Lv.0')); assert.ok(view.commands.includes('/分离 确认')); }
    else { assert.ok(view.text.includes('返还筑灵石300')); assert.ok(!view.commands.includes('/分离 确认')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
