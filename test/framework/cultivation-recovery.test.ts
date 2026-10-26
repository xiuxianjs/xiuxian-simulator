import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import grade from '../../src/response/soulArtifact/gradeUp/res';
import wash from '../../src/response/soulArtifact/wash/res';
import confirm from '../../src/response/soulArtifact/washConfirm/res';
import cancel from '../../src/response/soulArtifact/washCancel/res';
import upgrade from '../../src/response/soulArtifact/upgrade/res';
import decompose from '../../src/response/skillBook/decompose/res';
import switchSkill from '../../src/response/skillBook/switch/res';
import reset from '../../src/response/skillBook/reset/res';
import reroll from '../../src/response/skillBook/reroll/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: reset, command: '/重制功法 2', reason: '使用中的功法不能重制，请先换下该功法', expected: ['/我的功法'], text: '由你决定换下' },
  { handler: reset, command: '/重制功法 2', reason: '该功法当前没有可重制的词条或等级', expected: ['/我的功法'], text: '当前状态' },
  { handler: reset, command: '/重制功法 2', reason: '你有一份功法重制结果待确认，请先发送 /确认重制功法 或 /取消重制功法', expected: ['/我的功法', '/确认重制功法', '/取消重制功法'], text: '先回看原结果' },
  { handler: reset, command: '/确认重制功法', reason: '当前没有待确认的功法重制结果', expected: ['/我的功法'], text: '失效结果不能继续确认' },
  { handler: reset, command: '/取消重制功法', reason: '当前没有待取消的功法重制结果', expected: ['/我的功法'], text: '不自动重新消耗材料' },
  { handler: reset, command: '/确认重制功法', reason: '待确认的功法已不存在或状态已变化，重制结果已作废', expected: ['/我的功法'], text: '失效结果不能继续确认' },
  { handler: reroll, command: '/换词 2 物攻', reason: '换词符不足', expected: ['/储物袋'], text: '放弃不返还' },
  { handler: reroll, command: '/换词 2 物攻', reason: '无法识别词条「物攻」', expected: ['/我的功法'], text: '激活词条' },
  { handler: reroll, command: '/换词 2 物攻', reason: '当前功法没有激活词条「物攻」', expected: ['/我的功法'], text: '激活词条' },
  { handler: reroll, command: '/换词 2 物攻', reason: '当前没有可替换的目标词条', expected: ['/我的功法'], text: '当前状态' },
  { handler: reroll, command: '/确认换词 2', reason: '当前待确认的是功法ID 3 的换词结果', expected: ['/我的功法'], text: '核对已学编号' },
  { handler: reroll, command: '/取消换词', reason: '当前没有待取消的换词结果', expected: ['/我的功法'], text: '不自动重新消耗材料' },
  { handler: reroll, command: '/换词 2 物攻', reason: '操作繁忙，请稍后再试', expected: ['/我的功法'], text: '结果尚未明确时不重复消耗' },
  { handler: reset, command: '/确认重制功法', reason: '确认功法重制失败，请稍后再试', expected: ['/我的功法'], text: '保留原预览和结算回执' },
  { handler: reroll, command: '/换词 2', reason: '你有一份功法换词结果待确认，请先发送 /确认换词 或 /取消换词', expected: ['/我的功法'], text: '先回看原结果' },
  { handler: reroll, command: '/换词 2', reason: '该功法当前没有可替换的有效词条', expected: ['/我的功法'], text: '激活词条' },
  { handler: reroll, command: '/换词 2', reason: '找不到ID为 2 的已学功法', expected: ['/我的功法'], text: '有效编号' },
  { handler: reset, command: '/重制功法 2', reason: '找不到ID为 2 的已学功法', expected: ['/我的功法'], text: '有效编号' },
  { handler: reroll, command: '/确认换词 2', reason: '当前没有待确认的换词结果', expected: ['/我的功法'], text: '失效结果不能继续确认' },
  { handler: reroll, command: '/确认换词 2', reason: '待确认的功法已不存在，换词结果已作废', expected: ['/我的功法'], text: '失效结果不能继续确认' },
  { handler: reset, command: '/重制功法 2', reason: '操作繁忙，请稍后再试', expected: ['/我的功法'], text: '结果尚未明确时不重复消耗' },
  { handler: grade, command: '/本命物升品 2', reason: '需要 3 个同名法器本命物，当前只有 1 个', expected: ['/储物袋 本命'], text: '同名且同品' },
  { handler: grade, command: '/本命物升品 2', reason: '该本命物已升品，无法再次升品', expected: ['/储物袋 本命'], text: '不能再次升品' },
  { handler: grade, command: '/本命物升品 2', reason: '已达最高品级「道器」，无法继续升品', expected: ['/储物袋 本命'], text: '不能再次升品' },
  { handler: grade, command: '/本命物升品 2', reason: '未找到指定本命物', expected: ['/储物袋 本命'], text: '有效实例编号' },
  { handler: grade, command: '/本命物升品 2', reason: '珍宝楼上架中的本命物无法升品，请先下架', expected: ['/我的上架'], text: '下架' },
  { handler: wash, command: '/本命物洗涤', reason: '洗涤石不足', expected: ['/储物袋', '/珍宝楼'], text: '持有数量' },
  { handler: wash, command: '/本命物洗涤', reason: '你有一份本命物洗涤结果待确认，请先发送 /确认本命物洗涤 或 /取消本命物洗涤', expected: ['/本命物信息'], text: '放弃不返还洗涤石' },
  { handler: wash, command: '/本命物洗涤', reason: '所有可用词条已达洗涤上限，无需继续洗涤', expected: ['/本命物信息'], text: '不以补充洗涤石' },
  { handler: wash, command: '/本命物洗涤', reason: '当前没有可新增的词条', expected: ['/本命物信息'], text: '本次没有可用成长结果' },
  { handler: wash, command: '/本命物洗涤', reason: '当前没有可洗涤的成长结果', expected: ['/本命物信息'], text: '已有结算' },
  { handler: confirm, command: '/确认本命物洗涤', reason: '当前没有待确认的本命物洗涤结果', expected: ['/本命物信息'], text: '不反复确认旧结果' },
  { handler: confirm, command: '/确认本命物洗涤', reason: '待确认的本命物已不存在，结果已作废', expected: ['/本命物信息'], text: '已有结算' },
  { handler: cancel, command: '/取消本命物洗涤', reason: '当前没有待取消的本命物洗涤结果', expected: ['/本命物信息'], text: '不反复确认旧结果' },
  { handler: upgrade, command: '/本命物升级 5', reason: '当前等级 10 已达金丹上限 10', expected: ['/查看主线', '/我的境界'], text: '突破条件' },
  { handler: upgrade, command: '/本命物升级 5', reason: '筑灵石不足', expected: ['/储物袋 材料 其它', '/珍宝楼'], text: '可负担' },
  { handler: decompose, command: '/分解功法 2', reason: '该功法已被锁定，无法分解', expected: ['/储物袋 功法'], text: '重新核对确认内容' },
  { handler: decompose, command: '/分解功法 2', reason: '功法状态已变化，请重新确认分解', expected: ['/储物袋 功法'], text: '不重复执行旧分解' },
  { handler: switchSkill, command: '/切换战技 2', reason: '该功法已经在使用中', expected: ['/我的功法'], text: '无需重复切换' },
  { handler: switchSkill, command: '/切换战技 2', reason: '类型不匹配\n\n期望类型: 战技\n实际类型: 神通', expected: ['/我的功法'], text: '不同类型不能互相替代' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '培养提示', heading: '', text: entry.reason, buttons: [], advice: [] }]),
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
    if (entry.handler === grade && entry.reason === '需要 3 个同名法器本命物，当前只有 1 个') {
      assert.ok(view.text.includes('需要：同名法器 ×3'));
      assert.ok(view.text.includes('可用：1 件'));
    } else {
      assert.ok(view.text.includes(entry.reason));
    }
    assert.ok(view.text.includes(entry.text), view.text);
    for (const command of entry.expected) assert.ok(view.commands.includes(command), JSON.stringify(view));
    const recoveryWrites = view.commands.filter(command => /^\/(?:本命物洗涤|确认本命物洗涤|取消本命物洗涤|本命物升品|分解功法|本命物升级|重制功法|确认重制功法|取消重制功法|换词|确认换词|取消换词)(?:\s|$)/.test(command));
    assert.deepEqual(recoveryWrites.sort(), entry.handler === reset && entry.reason.startsWith('你有一份功法重制结果待确认') ? ['/确认重制功法', '/取消重制功法'].sort() : []);
    if (entry.handler === grade && mode === 'feedback') assert.ok(view.commands.includes('/本命物详情 2'));
    if (entry.reason === '洗涤石不足') assert.ok(!view.text.includes('锁定材料不能'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const reason of ['本命物服务尚未配置', '本命物升品配置异常', '本命物洗涤响应不完整', '操作繁忙，请稍后再试']) {
  test(`内部异常保留原因且不猜材料不足：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '', heading: '', text: reason, buttons: [], advice: []
    }]));
    const result = await app.runHandler(wash, app.events.privateMessage({ text: '/本命物洗涤', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes('失败提示不证明'));
    assert.ok(view.commands.includes('/本命物信息'));
    assert.ok(view.commands.includes('/储物袋'));
    assert.ok(!view.commands.some(command => /^\/(?:本命物洗涤|确认本命物洗涤|取消本命物洗涤)(?:\s|$)/.test(command)));
    assert.ok(!view.text.includes('补足'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
