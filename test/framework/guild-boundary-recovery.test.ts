import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import level from '../../src/response/guild/upgradeLevel/res';
import vein from '../../src/response/guild/upgradeVein/res';
import shop from '../../src/response/guild/upgradeShop/res';
import send from '../../src/response/guild/sendRedPacket/res';
import claim from '../../src/response/guild/claimRedPacket/res';
import recycle from '../../src/response/guild/recycleRedPacket/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: level, command: '/提升宗门等级', reason: '宗门等级已达上限', expected: '/我的宗门', text: '没有可继续升级的下一等级' },
  { handler: level, command: '/提升宗门等级', reason: '升级配置不可达：当前2级资源上限不足以支付升3级消耗', expected: '/我的宗门', text: '继续攒资源或补个人余额不能解除' },
  { handler: level, command: '/提升宗门等级', reason: '升3级需要声望100、灵石500，宗门资源不足', expected: '/我的宗门', text: '不等同本人灵石余额' },
  { handler: vein, command: '/提升宗门灵脉', reason: '宗门灵脉未解锁', expected: '/我的宗门', text: '未开放时不能直接升级' },
  { handler: vein, command: '/提升宗门灵脉', reason: '宗门灵脉尚未开启', expected: '/我的宗门', text: '核对宗门等级和灵脉开放状态' },
  { handler: vein, command: '/提升宗门灵脉', reason: '灵脉等级已达到当前宗门等级上限(2级)', expected: '/我的宗门', text: '不能直接绕过当前等级限制' },
  { handler: vein, command: '/提升宗门灵脉', reason: '宗门灵脉已达上限', expected: '/我的宗门', text: '没有可继续升级的下一等级' },
  { handler: shop, command: '/提升宗门商店', reason: '商店等级已达到当前宗门等级上限(2级)', expected: '/我的宗门', text: '允许的灵脉/商店上限' },
  { handler: shop, command: '/提升宗门商店', reason: '宗门商店已达上限', expected: '/我的宗门', text: '不反复消耗尝试' },
  { handler: shop, command: '/提升宗门商店', reason: '宗门资源不足', expected: '/我的宗门', text: '宗门资金条件' },
  { handler: send, command: '/发红包 灵石 5 100', reason: '你没有红包道具', expected: '/储物袋', text: '余额充足不能替代道具' },
  { handler: send, command: '/发红包 灵石 5 100', reason: '余额不足', expected: '/我的信息', text: '不能只准备净支出' },
  { handler: send, command: '/发红包 贡献点 5 100', reason: '贡献点不足', expected: '/宗门日常', text: '发送前需要持有份数乘以每份金额的全额' },
  { handler: send, command: '/发红包 金币 5 100', reason: '无效的货币类型：金币；可选：贡献点 / 灵晶 / 灵石', expected: '/发红包', text: '每份金额及总额' },
  { handler: send, command: '/发红包 灵石 7 100', reason: '无效的份数：7；可选：5 / 10 / 15 / 20 / 25 / 30', expected: '/发红包', text: '不直接使用无效参数发送' },
  { handler: claim, command: '/领红包 1', reason: '你已领取过此红包', expected: '/宗门红包', text: '不能重复到账' },
  { handler: claim, command: '/领红包 1', reason: '红包已过期', expected: '/宗门红包', text: '有效编号、到期与领取状态' },
  { handler: claim, command: '/领红包 1', reason: '红包已被领完', expected: '/宗门红包', text: '先保留原回执' },
  { handler: claim, command: '/领红包 1', reason: '红包不存在或已失效', expected: '/宗门红包', text: '本宗门当前列表' },
  { handler: claim, command: '/领红包', reason: '请输入有效的红包编号。', expected: '/宗门红包', text: '有效编号' },
  { handler: recycle, command: '/回收红包 1', reason: '没有执行该操作的权限', expected: '/我发的红包', text: '宗门职位不能替代发送者身份' },
  { handler: recycle, command: '/回收红包 1', reason: '红包尚未过期', expected: '/我发的红包', text: '按原红包到期时间等待' },
  { handler: recycle, command: '/回收红包 1', reason: '红包已回收', expected: '/我发的红包', text: '已回收不能再次退款' },
  { handler: recycle, command: '/回收红包 1', reason: '红包已被领完，无法回收', expected: '/我发的红包', text: '没有剩余可退' },
  { handler: recycle, command: '/回收红包 1', reason: '红包不存在', expected: '/我发的红包', text: '不按旧编号反复回收' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '宗门提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    if (entry.reason.includes('宗门资源不足')) {
      assert.ok(view.commands.includes('/宗门日常'));
      assert.ok(view.text.includes('签到增加宗门声望、采矿结算补充宗门灵石'));
    }
    assert.ok(!view.commands.some(command => /^\/(?:提升宗门|领红包|回收红包|发红包\s)/.test(command)));
    if (entry.handler === recycle && entry.reason.includes('权限')) assert.ok(!view.text.includes('核对本人宗门职位'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`发红包用法说明全额资金与到期回收 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'usage' }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/发红包', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/发红包', platform: 'qq-bot' });
    const result = await app.runHandler(send, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('先持有“份数×每份金额”的全额'));
    assert.ok(view.text.includes('发送者随后自动领取1份'));
    assert.ok(view.text.includes('过期未领完的剩余余额可由发送者'));
    assert.ok(!view.text.includes('到期后丢弃'));
    assert.ok(view.commands.includes('/我发的红包'));
    assert.ok(view.commands.includes('/我的信息'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('红包道具未配置不误导购买或补余额', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
    title: '宗门提示', heading: '', text: '系统尚未配置红包道具', buttons: [], advice: []
  }]));
  const result = await app.runHandler(send, app.events.privateMessage({ text: '/发红包 灵石 5 100', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('系统尚未配置红包道具'));
  assert.ok(!view.text.includes('建议：'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
