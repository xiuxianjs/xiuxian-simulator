import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/tribulation/res';
import publicHandler from '../../src/response/tribulation/publicRes';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const progress = { successful: 1, requiredAttempts: 3, attackBonusPercent: .5, completed: false };
const preparation = { eventId: 7, targetRealm: '合体', status: 'charging', requiredAttempts: 3, canStart: false, opensAt: '2026-10-21T00:00:00Z', deadline: '2026-10-21T06:00:00Z', retryAt: '2026-10-21T06:30:00Z', strikeAt: '2026-10-21T00:30:00Z', qualityProgress: progress };
const charging = { eventId: 7, status: 'charging', grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64), confirmedAt: preparation.opensAt, strikeAt: preparation.strikeAt, refunded: false };
const receipt = { eventId: 7, grade: 'high', success: false, promoted: false, experienceBefore: 100, experienceAfter: 90, progress, materials: [{ itemId: 10, itemName: '渡劫石', requiredQuantity: 1 }], battle: { name: '雷劫', summary: '本次未通过', totalLayers: 3, passedLayers: 2 } };
const publicEvent = { eventId: 7, playerId: 2, name: '阿月', currentRealm: '化神圆满', targetRealm: '合体', targetStage: 6, tribulationName: '雷劫', requiredAttempts: 3, status: 'charging', opensAt: preparation.opensAt, deadline: preparation.deadline, strikeAt: preparation.strikeAt, interactionOpen: true, participationOpen: true, canStart: false };

for (const status of ['charging', 'cancelled', 'succeeded', 'failed']) {
  test(`我的劫云能直达原事件状态：${status}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      request.body.arguments && (request.body.arguments as { kind: string }).kind === 'overview'
        ? { tribulationPreparation: { ...preparation, status } }
        : status === 'cancelled' ? { ...charging, status, refunded: true, cancelledReason: '配置变化' } : status === 'charging' ? charging : { ...receipt, success: status === 'succeeded' }));
    const initial = await app.runHandler(handler, app.events.privateMessage({ text: '/我的渡劫', platform: 'qq-bot' }));
    const first = initial.messages[0];
    assert.ok(first);
    assert.equal(initial.actions[first.actionIndex].results?.[0].code, ResultCode.Ok);
    const command = inspectMessage(first.nodes).commands.find(value => value === '/渡劫结算 7');
    assert.ok(command);
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(view.commands.includes('/我的渡劫'));
    assert.ok(view.commands.includes('/渡劫结算 7'));
    if (status === 'cancelled') assert.match(view.text, /材料已返还/);
    if (status === 'failed') assert.match(view.text, /本次通过：2\/3层/);
    assert.deepEqual(requests.map(r => (r.body.arguments as { kind: string }).kind), ['overview', 'receipt']);
  });
}

test('晋级完成后显示回执入口，不再引导重试同一境界', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { tribulationPreparation: { ...preparation, status: 'succeeded', qualityProgress: { ...progress, successful: 3, completed: true } } }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/我的渡劫', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /渡劫已完成|品质已生效/);
  assert.doesNotMatch(view.text, /再次预告最早|晋级后生效/);
  assert.ok(view.commands.includes('/渡劫结算 7'));
});

for (const own of [false, true]) {
  test(`公开详情按本人身份展示操作与因果提示：${own}`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { ...publicEvent, playerId: own ? 1 : 2, disruptionKarmaEnabled: true }));
    const result = await app.runHandler(publicHandler, app.events.privateMessage({ text: '/观望渡劫 7', platform: 'qq-bot' }));
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.equal(view.commands.includes('/捣乱渡劫 7'), !own);
    assert.equal(view.commands.includes('/参与观望 7'), !own);
    assert.ok(view.commands.includes('/我的渡劫'));
    if (!own) {
      const quote = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).find(node => node.type === 'MD.blockquote' && JSON.stringify(node).includes('/捣乱渡劫 7'));
      assert.ok(quote);
      assert.match(JSON.stringify(quote), /本人后续渡劫因果/);
      assert.match(view.text, /实际到账受资格与存储上限限制/);
    }
  });
}

for (const mode of ['http', 'feedback', 'transport'] as const) {
  for (const command of ['/参与观望 7', '/捣乱渡劫 7', '/暂避渡劫 7', '/渡劫结算 7', '/观望渡劫 7']) {
    test(`${mode}错误保留原事件，只提供读取入口：${command}`, async t => {
      const reason = '本次窗口已关闭';
      const { app, requests } = await gameFixture(t, request => mode === 'feedback'
        ? businessEnvelope(request.bid, undefined, [{ title: '操作未完成', heading: '', text: reason, buttons: [], advice: [] }])
        : { code: mode === 'http' ? 'CONFLICT' : 'INTERNAL_ERROR', message: reason }, mode === 'feedback' ? 200 : mode === 'http' ? 409 : 500);
      const result = await app.runHandler(command.startsWith('/观望') ? publicHandler : handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.ok(view.commands.includes('/观望渡劫 7') || view.commands.includes('/渡劫结算 7'));
      assert.ok(view.commands.includes('/我的渡劫'));
      assert.ok(!view.commands.some(value => /^\/(参与观望|捣乱渡劫|暂避渡劫|渡劫开劫) /.test(value)));
      assert.equal(requests.length, 1, 'no automatic write replay or fallback HTTP');
    });
  }
}


test('完整按钮链：评级确认、待落雷、失败回执、恢复查询与新事件', async t => {
  const unit = { Name: '修士', HP: 100, MP: 50, PhysicalAttack: 20, MagicAttack: 20, PhysicalDefense: 5, MagicDefense: 5, Speed: 10 };
  const confirmation = { eventId: 7, grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64), rewardScope: 'current', experienceBefore: 100, successExperienceCost: 0, failureExperienceAfter: 90, progress, materials: [{ itemId: 10, quantity: 1 }], battle: { mode: 'continuous_layers_v1', name: '雷劫', player: unit, layers: [{ layer: 1, enemies: [unit] }] } };
  const confirmationReference = 'r1_7_t_m1234_' + 'b'.repeat(24);
  let phase = 'preparing';
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as { kind: string };
    if (args.kind === 'overview') return businessEnvelope(request.bid, { tribulationPreparation: { ...preparation, eventId: phase === 'next' ? 8 : 7, status: phase === 'next' ? 'preparing' : phase, canStart: phase === 'preparing' || phase === 'next', gradeOptions: [{ grade: 'high', attackMultiplier: 1.2, attackBonusPercent: 1 }], ...(phase === 'failed' ? { recoveryEndsAt: '2026-10-22T00:30:00Z', earliestRetryAt: '2026-10-22T00:30:00Z' } : {}) } });
    if (args.kind === 'confirm') return businessEnvelope(request.bid, { confirmation, materialNames: { 10: '渡劫石' }, confirmationReference });
    if (args.kind === 'reference') { phase = 'charging'; return businessEnvelope(request.bid, { ...charging, resolvedCommand: { kind: 'start', eventId: 7, input: { grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion } } }); }
    return businessEnvelope(request.bid, phase === 'failed' ? receipt : charging);
  });
  const run = async (command: string) => {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const click = (view: ReturnType<typeof inspectMessage>, match: (value: string) => boolean) => {
    const command = view.commands.find(match); assert.ok(command); return command;
  };
  let view = await run('/我的渡劫');
  view = await run(click(view, value => value === '/渡劫评级 7 high'));
  assert.match(view.text, /失败后剩余：90/);
  view = await run(click(view, value => value === '/渡劫开劫 ' + confirmationReference));
  view = await run(click(view, value => value === '/渡劫结算 7'));
  assert.match(view.text, /等待落雷/);
  phase = 'failed';
  view = await run(click(view, value => value === '/渡劫结算 7'));
  assert.match(view.text, /100 → 90/);
  view = await run(click(view, value => value === '/我的渡劫'));
  assert.match(view.text, /失败恢复结束/);
  assert.ok(!view.commands.some(value => value.startsWith('/渡劫评级 ')));
  phase = 'next';
  view = await run(click(view, value => value === '/我的渡劫'));
  assert.ok(view.commands.includes('/渡劫评级 8 high'));
  assert.equal(requests.filter(r => (r.body.arguments as { kind: string }).kind === 'reference').length, 1);
});

test('公开列表拒绝后仍保留原页与完整道号筛选', async t => {
  const { app } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '稍后再试' }), 409);
  const result = await app.runHandler(publicHandler, app.events.privateMessage({ text: '/劫云榜 2 道号 张  三', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.ok(inspectMessage(message.nodes).commands.includes('/劫云榜 2 道号 张  三'));
});

test('达标只显示开启入口，开启后显示不限时材料准备，两个动作分开', async t => {
  const ready = {eventId:7,targetRealm:'合体',status:'ready',requiredAttempts:3,canOpen:true,canStart:false};
  const opened = {...ready,status:'opened',canOpen:false,opensAt:'2026-10-22T00:00:00Z',materials:[{itemId:10,itemName:'渡劫石',currentQuantity:0,requiredQuantity:1,sufficient:false}]};
  const kinds: string[] = [];
  const {app} = await gameFixture(t, request => {
    const kind = (request.body.arguments as {kind:string}).kind;
    kinds.push(kind);
    return businessEnvelope(request.bid, kind === 'open' ? opened : {tribulationPreparation:ready});
  });
  const initial=await app.runHandler(handler,app.events.privateMessage({text:'/我的渡劫',platform:'qq-bot'}));
  const first=initial.messages[0];
  assert.equal(initial.actions[first.actionIndex].results?.[0].code,ResultCode.Ok);
  const initialView=inspectMessage(first.nodes);
  assert.ok(initialView.commands.includes('/开启渡劫 7'));
  assert.doesNotMatch(initialView.text,/材料|截止|30分钟/);
  const result=await app.runHandler(handler,app.events.privateMessage({text:'/开启渡劫 7',platform:'qq-bot'}));
  const message=result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const view=inspectMessage(message.nodes);
  assert.match(view.text,/准备时间不限/);
  assert.match(view.text,/渡劫石：0\/1（不足）/);
  assert.match(view.text,/确认开始后.*30分钟后落雷/);
  assert.doesNotMatch(view.text,/确认截止/);
  assert.deepEqual(kinds,['overview','open']);
});

test('服务端短编号确认使用原操作并保留重试编号', async t => {
  const ref = 'r1_7_t_m1234_' + 'a'.repeat(24);
  const resolvedCommand = { kind: 'start', eventId: 7, input: { grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64) } };
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { ...charging, resolvedCommand }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫开劫 ' + ref, platform: 'qq-bot' }));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(requests[0].body.arguments, { kind: 'reference', reference: ref });
  assert.match(inspectMessage(result.messages[0].nodes).text, /渡劫|落雷/);
});

test('心魔预览按钮使用服务端编号，回答仍固定原选择', async t => {
 const ref = 'r1_7_h_m1234_' + 'c'.repeat(24);
 const heart = { policyVersion: 'c'.repeat(64), topic: 'general', title: '求道之问', prompt: '如何面对雷劫？', options: [{ id: 'guard', name: '固守', attackMultiplier: .98, defenseMultiplier: 1.02 }, { id: 'slay', name: '斩念', attackMultiplier: 1.02, defenseMultiplier: .98 }, { id: 'accept', name: '接纳', attackMultiplier: 1, defenseMultiplier: 1 }] };
 const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid,
  (r.body.arguments as {kind:string}).kind === 'heartPreview'
   ? { tribulationPreparation: { ...preparation, status: 'opened', canAnswerHeartDemon: true, heartDemon: heart }, confirmationReference: ref }
   : { ...heart, choice: 'accept', answeredAt: '2026-10-24T00:00:00Z', resolvedCommand: { kind: 'heartAnswer', eventId: 7, choice: 'accept', policyVersion: heart.policyVersion } }));
 const preview = await app.runHandler(handler, app.events.privateMessage({text:'/心魔选择 7 accept',platform:'qq-bot'}));
 const command = inspectMessage(preview.messages[0].nodes).commands.find(c => c.startsWith('/心魔回答 '));
 assert.equal(command, '/心魔回答 ' + ref);
 const result = await app.runHandler(handler, app.events.privateMessage({text:command!,platform:'qq-bot'}));
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 assert.match(inspectMessage(result.messages[0].nodes).text,/已固定|接纳/);
 assert.deepEqual(requests[1].body.arguments,{kind:'reference',reference:ref});
});
