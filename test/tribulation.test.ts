import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ResultCode } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../src/response/tribulation/res';
import { businessEnvelope, gameFixture } from './framework/fixture';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { createClient } from '../src/api/core';
import type { InternalAxiosRequestConfig } from 'axios';
import { renderTribulationPanel } from '../src/response/tribulation/render';
import { BackendAPIError } from '../src/api/bot/client';
import { cultivationOperationDefinitions } from '../src/api/domains/cultivation/operations';
import { parseTribulationAttackLimit, parseTribulationHeartDemon, parseTribulationConfirmation, parseTribulationReceipt, type TribulationConfirmation, type TribulationReceipt } from '../src/api/schemas/tribulation';
import { parseTribulationCommand, runTribulationCommand, tribulationHeartDemonPanel, tribulationConfirmationPanel, tribulationPreparationPanel, tribulationReceiptPanel, tribulationStartCommand } from '../src/response-apps/tribulation/app';

const unit = { Name: '修士', HP: 100, MP: 50, PhysicalAttack: 20, MagicAttack: 20, PhysicalDefense: 5, MagicDefense: 5, Speed: 10 };
const progress = { successful: 1, requiredAttempts: 3, attackBonusPercent: 0.5, completed: false };
const confirmation: TribulationConfirmation = { eventId: 7, grade: 'high', attackMultiplier: 1.2, conditionVersion: 'a'.repeat(64), rewardScope: 'current', experienceBefore: 100, successExperienceCost: 0, failureExperienceAfter: 90, progress, materials: [{ itemId: 10, quantity: 1 }], battle: { mode: 'continuous_layers_v1', name: '四九雷劫', player: unit, layers: [{ layer: 2, enemies: [{ ...unit, Name: '雷兵' }] }] } };
const receipt: TribulationReceipt = { eventId: 7, grade: 'high', success: true, promoted: false, experienceBefore: 100, experienceAfter: 100, progress: { ...progress, successful: 2, attackBonusPercent: 0.75 }, materials: [{ itemId: 10, itemName: '渡劫石', requiredQuantity: 1 }], battle: { name: '四九雷劫', summary: '本次雷劫通过', totalLayers: 1, passedLayers: 1 } };
const params = { bid: 'platform-player', uid: 101, request: { requestId: 'message-1', idempotencyKey: 'message-1' } };
const overview = { promotion: { materials: [{ itemId: 10, itemName: '渡劫石' }] }, tribulationPreparation: { eventId: 7, targetRealm: '洞虚', status: 'opened', opensAt: '2026-10-01T01:00:00Z', deadline: '2026-10-01T07:00:00Z', retryAt: '2026-10-01T08:00:00Z', requiredAttempts: 3, canStart: true, qualityProgress: progress, gradeOptions: [{ grade: 'high', attackMultiplier: 1.2, attackBonusPercent: 1 }] } };
const missing = new BackendAPIError('尚无回执', 'NOT_FOUND', 404);
type Api = NonNullable<Parameters<typeof runTribulationCommand>[2]>;
function api(overrides: Partial<Api> = {}): Api {
  return { open: async () => { throw new Error('unexpected open'); }, participate: async () => { throw new Error('unexpected participate'); }, answerHeartDemon: async () => { throw new Error('unexpected heart answer'); }, evade: async () => { throw new Error('unexpected evade'); }, disrupt: async () => { throw new Error('unexpected disrupt'); }, overview: async () => overview, confirm: async () => ({ confirmation, materialNames: { 10: '渡劫石' } }), receipt: async () => { throw missing; }, start: async () => { throw new Error('unexpected start'); }, ...overrides };
}
const lines = (panel: ReturnType<typeof tribulationReceiptPanel>) => panel.sections.flatMap(s => s.lines).join('\n');

test('closed preparation states do not suggest repairing eligibility for the same event', () => {
  for (const status of ['succeeded', 'failed', 'expired', 'cancelled', 'evaded']) {
    const panel = tribulationPreparationPanel({ tribulationPreparation: { ...overview.tribulationPreparation, status, canStart: false } });
    assert.doesNotMatch(lines(panel), /当前不能开劫|评级开劫尚未启用/);
    assert.match(lines(panel), /再次开启最早/);
  }
});

test('registered metadata matches the actual Go routes and start body is mandatory', () => {
  const document = YAML.parse(readFileSync('../xiuxian-game-server/docs/openapi.yaml', 'utf8'));
  for (const id of ['post_players_id_tribulation_events_eventId_confirmation', 'post_players_id_tribulation_events_eventId_start', 'get_players_id_tribulation_events_eventId_result'] as const) {
    const definition = cultivationOperationDefinitions[id];
    const operation = document.paths[definition.path.replace('/api/v1', '')][definition.method.toLowerCase()];
    assert.equal(operation.operationId, id);
    assert.deepEqual(operation.parameters.map((p: { name: string }) => p.name), definition.pathParams.map(p => p.name));
    assert.equal(Boolean(operation.requestBody?.required), definition.bodyRequired);
  }
  assert.deepEqual(document.paths['/players/{id}/tribulation-events/{eventId}/start'].post.requestBody.content['application/json'].schema.required, ['grade', 'attackMultiplier', 'conditionVersion']);
});
test('confirmation commands round-trip the exact submitted conditions and reject invalid identities', () => {
  assert.deepEqual(parseTribulationCommand(tribulationStartCommand(confirmation)), { kind: 'start', eventId: 7, input: { grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion } });
  for (const command of ['/渡劫开劫 0 high 1.2 ' + confirmation.conditionVersion, '/渡劫开劫 7 high NaN ' + confirmation.conditionVersion, '/渡劫开劫 7 high 1.2 old', '/渡劫评级 7 unknown', '/渡劫结算 7 extra', '/渡劫结算 9007199254740993']) assert.equal(parseTribulationCommand(command), null);
});
test('strict confirmation requires server costs and continuous mode but allows zero intermediate cost', () => {
  assert.deepEqual(parseTribulationConfirmation(confirmation), confirmation);
  assert.throws(() => parseTribulationConfirmation({ ...confirmation, successExperienceCost: undefined }));
  assert.throws(() => parseTribulationConfirmation({ ...confirmation, battle: { ...confirmation.battle, mode: undefined } }));
  assert.throws(() => parseTribulationReceipt({ ...receipt, progress: { ...progress, successful: 4 } }));
});
test('preparation and confirmation bubbles keep the actual actions with costs and progress', () => {
  const panel = tribulationPreparationPanel(overview);
  assert.match(lines(panel), /累计成功：1\/3/);
  assert.ok(panel.sections.some(section => section.buttons?.some(button => button.command === '/渡劫评级 7 high')));
  const confirm = tribulationConfirmationPanel(confirmation, { 10: '渡劫石' });
  assert.match(lines(confirm), /本次成功消耗修为：0/);
  assert.match(lines(confirm), /渡劫石 ×1/);
  assert.ok(confirm.sections.some(section => section.buttons?.some(button => button.command === tribulationStartCommand(confirmation))));
});
test('partial success, final promotion and failure have distinct authoritative settlement bubbles', () => {
  const partial = tribulationReceiptPanel(receipt);
  assert.equal(partial.title, '本次渡劫成功');
  assert.match(lines(partial), /累计成功 2\/3/);
  assert.match(lines(partial), /尚未生效/);
  const final = tribulationReceiptPanel({ ...receipt, promoted: true, progress: { ...receipt.progress, successful: 3, completed: true } });
  assert.equal(final.title, '渡劫晋级成功');
  assert.match(lines(final), /已生效/);
  const failed = tribulationReceiptPanel({ ...receipt, success: false, experienceAfter: 90, progress });
  assert.equal(failed.title, '本次渡劫失败');
  assert.match(lines(failed), /累计成功 1\/3/);
  assert.match(lines(failed), /已有成功进度保留/);
});
test('view and confirmation never start combat; every operation uses the acting game UID', async () => {
  const calls: unknown[][] = [];
  const backend = api({ overview: async (...args) => { calls.push(['overview', ...args]); return overview; }, confirm: async (...args) => { calls.push(['confirm', ...args]); return { confirmation, materialNames: { 10: '渡劫石' } }; } });
  await runTribulationCommand('/我的渡劫', params, backend);
  const panel = await runTribulationCommand('/渡劫评级 7 high', params, backend);
  assert.match(lines(panel), /渡劫石 ×1/);
  assert.ok(calls.every(call => call[2] === 101));
  assert.ok(calls.every(call => call[0] !== 'start'));
  assert.deepEqual(calls.map(call => call[0]), ['overview', 'confirm']);
});
test('transport loss first reads the committed receipt without starting a second attempt', async () => {
  let starts = 0, reads = 0;
  const backend = api({ start: async () => { starts++; throw new Error('connection lost'); }, receipt: async (_bid, uid, eventId) => { assert.equal(uid, 101); assert.equal(eventId, 7); reads++; return receipt; } });
  const panel = await runTribulationCommand(tribulationStartCommand(confirmation), params, backend);
  assert.equal(panel.title, '本次渡劫成功');
  assert.equal(starts, 1); assert.equal(reads, 1);
});
test('missing recovery keeps the exact original command; a conflict requires fresh confirmation', async () => {
  const original = tribulationStartCommand(confirmation);
  const pending = await runTribulationCommand(original, params, api());
  assert.equal(pending.title, '渡劫结果待确认');
  assert.match(lines(pending), /不代表开劫未执行/);
  assert.equal(pending.sections[0].buttons?.find(b => b.label === '按原确认重试')?.command, original);
  const stale = await runTribulationCommand(original, params, api({ start: async () => { throw new BackendAPIError('条件已变化', 'CONFLICT', 409); } }));
  assert.equal(stale.title, '渡劫条件已变化');
  assert.ok(!stale.sections[0].buttons?.some(b => b.label === '按原确认重试'));
});

test('SDK transports the confirmed conditions under the acting identity and recovery uses GET', async () => {
  const requests: InternalAxiosRequestConfig[] = [];
  const client = createClient({ baseUrl: 'https://backend.invalid', identity: { kind: 'robot', token: 'test-only', bid: params.bid }, adapter: async config => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config, data: JSON.stringify({ data: receipt }) };
  } });
  await client.request('post_players_id_tribulation_events_eventId_start', { path: { id: 101, eventId: 7 }, body: { grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion } });
  await client.request('get_players_id_tribulation_events_eventId_result', { path: { id: 101, eventId: 7 } });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].method?.toUpperCase(), 'POST');
  assert.equal(new URL(requests[0].url!).pathname, '/api/v1/players/101/tribulation-events/7/start');
  assert.deepEqual(JSON.parse(requests[0].data), { grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion });
  assert.equal(requests[0].headers.get('X-Bid'), params.bid);
  assert.equal(requests[1].method?.toUpperCase(), 'GET');
  assert.equal(new URL(requests[1].url!).pathname, '/api/v1/players/101/tribulation-events/7/result');
  assert.equal(requests[1].data, undefined);
});

test('native Markdown retains the cost and original confirmation reference', async t => {
  const reference = 'r1_1_t_m1234_' + 'b'.repeat(24);
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { confirmation, materialNames: { 10: '渡劫石' }, confirmationReference: reference }));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫评级 7 high', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const markdown = message.nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown);
  const quote = markdown.value.find(node => node.type === 'MD.blockquote' && JSON.stringify(node).includes('/渡劫开劫 ' + reference));
  assert.ok(quote && quote.type === 'MD.blockquote' && Array.isArray(quote.value));
  const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
  assert.match(view.text, /渡劫石 ×1/);
  assert.match(view.text, /本次成功消耗修为：0/);
  assert.ok(view.commands.includes('/渡劫开劫 ' + reference));
});

test('weather bubble keeps actual modifiers without calculation traces and preserves receipt weather', () => {
  const weather={id:'storm',name:'雷暴',startsAt:'2026-10-01T00:00:00Z',changesAt:'2026-10-01T01:00:00Z',npc:{critRatePoints:5},changes:[{layer:confirmation.battle.layers[0].layer,position:1,attribute:'critRate' as const,before:25,after:30}]};
  const c=parseTribulationConfirmation({...confirmation,weather});
  const text=lines(tribulationConfirmationPanel(c));
  assert.match(text,/天气：雷暴 · 影响雷劫/);
  assert.match(text,/暴击率 \+5点/);
  assert.doesNotMatch(text,/25 → 30|不是最终暴击概率/);
  assert.throws(()=>parseTribulationConfirmation({...confirmation,weather:{...weather,npc:{critRatePoints:101}}}));
  assert.throws(()=>parseTribulationConfirmation({...confirmation,weather:{...weather,npc:{playerAttackMultiplier:2}}}));
  const r=parseTribulationReceipt({...receipt,conditions:{weather}});
  assert.match(lines(tribulationReceiptPanel(r)),/本场固定天气：雷暴/);
});

test('charging and refund bubbles never declare a completed battle and restore transport loss', async () => {
 const charging={eventId:7,status:'charging' as const,grade:'high' as const,attackMultiplier:1.2,conditionVersion:confirmation.conditionVersion,confirmedAt:'2026-10-01T01:00:00Z',strikeAt:'2026-10-01T01:30:00Z',refunded:false};
 const parsed=parseTribulationReceipt(charging);
 assert.equal(tribulationReceiptPanel(parsed).title,'等待落雷');
 assert.match(lines(tribulationReceiptPanel({...charging,status:'cancelled',refunded:true})),/材料已返还/);
 const panel=await runTribulationCommand(tribulationStartCommand(confirmation),params,api({start:async()=>{throw new Error('lost');},receipt:async()=>charging}));
 assert.equal(panel.title,'等待落雷');
 assert.ok(!lines(panel).includes('本次渡劫成功'));
});
test('disruption uses the acting UID and provides only public effect in the receipt bubble',async()=>{
 const calls:unknown[][]=[];
 const panel=await runTribulationCommand('/捣乱渡劫 7',params,api({disrupt:async(...args)=>{calls.push(args);return {eventId:7,participated:true,summary:{count:12,attackBonusPercent:10}}}}));
 assert.equal(calls[0][1],101);assert.equal(calls[0][2],7);
 assert.equal(panel.title,'本场已捣乱');assert.match(lines(panel),/上限10%/);
 assert.equal(panel.sections[0].buttons?.[0].command,'/劫云榜');
});
test('private causal conditions show sources and bounded NPC increase without changing quality',()=>{
 const karma={policyVersion:'b'.repeat(64),capturedAt:'2026-10-01T01:00:00Z',currentShaQi:20,shaQiAttackBonusPercent:2,activeDisruptions:2,disruptionAttackBonusPercent:3,npcAttackBonusPercent:4};
 const c=parseTribulationConfirmation({...confirmation,karma});
 assert.match(lines(tribulationConfirmationPanel(c)),/当前煞气20.*\+2%/);
 assert.match(lines(tribulationConfirmationPanel(c)),/合计.*\+4%.*不增加品质奖励/);
 assert.throws(()=>parseTribulationConfirmation({...confirmation,karma:{...karma,npcAttackBonusPercent:6}}));
 const r=parseTribulationReceipt({...receipt,conditions:{karma}});
 assert.match(lines(tribulationReceiptPanel(r)),/本场因果.*\+4%/);
});

test('voluntary evasion shows the next penalty before write and retries the same event', async () => {
 const panel = tribulationPreparationPanel({tribulationPreparation:{...overview.tribulationPreparation,canEvade:true,evasion:{policyVersion:'a'.repeat(64),level:1,npcAttackBonusPercent:2},evasionPreview:{nextLevel:2,nextAttackBonusPercent:4,resetAfterSeconds:60}}});
 assert.match(lines(panel), /主动暂避后：2档.*4%/);
 assert.equal(panel.sections.flatMap(section=>section.buttons??[]).find(b=>b.label==='主动暂避')?.command,'/暂避渡劫 7');
 let calls=0;
 const result=await runTribulationCommand('/暂避渡劫 7',params,api({evade:async(_bid,uid,id)=>{assert.equal(uid,101);assert.equal(id,7);calls++;return {eventId:7,status:'evaded',levelAfter:2,recoversAt:overview.tribulationPreparation.retryAt,retryAt:overview.tribulationPreparation.retryAt};}}));
 assert.equal(calls,1);assert.equal(result.title,'本次已主动暂避');assert.match(lines(result),/未扣除材料，累计成功进度保留/);
 assert.equal(parseTribulationCommand('/暂避渡劫 7 extra'),null);
});

const heart = { policyVersion:'c'.repeat(64), topic:'general' as const, title:'求道之问', prompt:'你将如何面对新的境界？', options:[{id:'guard' as const,name:'固守',attackMultiplier:.98,defenseMultiplier:1.02},{id:'slay' as const,name:'斩念',attackMultiplier:1.02,defenseMultiplier:.98},{id:'accept' as const,name:'接纳',attackMultiplier:1,defenseMultiplier:1}] };
test('heart choice preview is read-only and explicit confirmation preserves the version and acting UID', async () => {
 const data={...overview,tribulationPreparation:{...overview.tribulationPreparation,canAnswerHeartDemon:true,heartDemon:heart}};
 let answers=0;
 const dependencies=api({overview:async()=>data,answerHeartDemon:async(_bid,uid,eventId,choice,version)=>{
   assert.equal(uid,101);assert.equal(eventId,7);assert.equal(choice,'guard');assert.equal(version,heart.policyVersion);answers++;
   return {...heart,choice,answeredAt:'2026-10-01T01:00:00Z'};
 }});
 const preview=await runTribulationCommand('/心魔选择 7 guard',params,dependencies);
 assert.equal(answers,0);assert.match(lines(preview),/本场玩家双攻击 ×0.98，双防御 ×1.02/);
 const command=preview.sections[0].buttons?.[0].command!;
 const answered=await runTribulationCommand(command,params,dependencies);assert.equal(answers,1);assert.equal(answered.title,'本次心魔已固定');
 assert.equal(parseTribulationCommand('/心魔回答 7 guard old'),null);
 assert.equal(parseTribulationCommand('/心魔选择 7 unknown'),null);
 assert.throws(()=>parseTribulationHeartDemon({...heart,options:heart.options.map(o=>o.id==='accept'?{...o,attackMultiplier:1.1}:o)}));
});
test('native heart confirmation keeps effect, one answer restriction and action in the same quote', () => {
 const rendered=renderTribulationPanel(tribulationHeartDemonPanel(7,heart,'guard'), {isPrivate:true});
 const markdown=rendered.format.value.find(node=>node.type==='Markdown');
 assert.ok(markdown);const quote=markdown.value.find(node=>node.type==='MD.blockquote');assert.ok(quote);
 const raw=JSON.stringify(quote.value);assert.match(raw,/本场玩家双攻击/);assert.match(raw,/本场回答不可更改/);assert.match(raw,/心魔回答 7 guard/);
});

const attackLimit = { maxMultiplier: 1.03, changes: [{ layer: 2, position: 1, attribute: 'physicalAttack' as const, base: 100, before: 133, after: 103 }] };
test('total attack cap stays private and validated without exposing calculation traces', () => {
  assert.deepEqual(parseTribulationAttackLimit(attackLimit), attackLimit);
  const c = { ...confirmation, attackMultiplier: 1.01, attackLimit };
  assert.deepEqual(parseTribulationConfirmation(c).attackLimit, attackLimit);
  const preview = lines(tribulationConfirmationPanel(c, {}, true));
  assert.match(preview, /雷劫双攻击上限：基础 ×1.03/);
  assert.doesNotMatch(preview, /叠加后|原配置|实际103/);
  assert.match(preview, /雷兵 · 生命 100/);
  const r = { ...receipt, conditions: { attackLimit } };
  const parsed = parseTribulationReceipt(r);
  if ('status' in parsed) throw new Error('expected settled receipt');
  assert.deepEqual(parsed.conditions?.attackLimit, attackLimit);
  assert.match(lines(tribulationReceiptPanel(r)), /本场雷劫双攻击上限：基础 ×1.03/);
  assert.deepEqual(parseTribulationAttackLimit({ maxMultiplier: .8, changes: [] }), { maxMultiplier: .8, changes: [] });
  for (const bad of [null, { ...attackLimit, maxMultiplier: 0 }, { ...attackLimit, changes: undefined }, { ...attackLimit, changes: [attackLimit.changes[0], attackLimit.changes[0]] }, { ...attackLimit, changes: [{ ...attackLimit.changes[0], after: 104 }] }, { ...attackLimit, changes: [{ ...attackLimit.changes[0], attribute: 'playerAttack' }] }]) {
    assert.throws(() => parseTribulationAttackLimit(bad));
    assert.throws(() => parseTribulationConfirmation({ ...c, attackLimit: bad }));
    assert.throws(() => parseTribulationReceipt({ ...r, conditions: { attackLimit: bad } }));
  }
});

test('participation writes immediately and renders the durable reward with its button', async t => {
 const reward = { baseExperience: 10, creditedExperience: 10, dailyRewarded: 1, dailyLimit: 3, rewardDate: '2026-10-19', reason: 'granted', repeated: false };
 assert.deepEqual(parseTribulationCommand('/参与观望 7'), { kind: 'participate', eventId: 7 });
 const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
   eventId: 7, participated: true, reward: { ...reward, repeated: (r.body.arguments as { kind: string }).kind === 'disrupt' },
   ...((r.body.arguments as { kind: string }).kind === 'disrupt' ? { summary: { count: 1, attackBonusPercent: 1 } } : {})
 }));
 const result = await app.runHandler(handler, app.events.privateMessage({ text: '/参与观望 7', platform: 'qq-bot' }));
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const view = inspectMessage(message.nodes);
 assert.match(view.text, /修为 \+10.*即时到账/);
 assert.match(view.text, /1\/3/);
 assert.ok(view.commands.includes('/劫云榜'));
 const repeated = await app.runHandler(handler, app.events.privateMessage({ text: '/捣乱渡劫 7', platform: 'qq-bot' }));
 assert.equal(repeated.messages.length, 1);
 assert.equal(repeated.actions[repeated.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 assert.match(inspectMessage(repeated.messages[0].nodes).text, /未重复发放/);
 assert.deepEqual(requests.map(r => r.body.arguments), [{ kind: 'participate', eventId: 7 }, { kind: 'disrupt', eventId: 7 }]);
});

test('preparation groups heart choices and evasion risks with their own actions', () => {
  const selectedHeart = parseTribulationHeartDemon(heart);
  const panel = tribulationPreparationPanel({ tribulationPreparation: { ...overview.tribulationPreparation, heartDemon: selectedHeart, canAnswerHeartDemon: true, canEvade: true, evasionPreview: { nextLevel: 2, nextAttackBonusPercent: 4, resetAfterSeconds: 60 } } });
  const heartSection = panel.sections.find(s => s.lines.some(line => line.startsWith('心魔 ·')));
  assert.ok(heartSection);
  assert.ok(heartSection.buttons?.some(b => b.command.startsWith('/心魔选择 7 ')));
  const evasion = panel.sections.find(s => s.buttons?.some(b => b.command === '/暂避渡劫 7'));
  assert.ok(evasion);
  assert.match(evasion.lines.join('\n'), /双攻击 \+4%.*60秒/);
  assert.match(evasion.lines.join('\n'), /成功进度保留/);
  assert.ok(!panel.sections[0].buttons?.some(b => /心魔选择|暂避渡劫/.test(b.command)));
  assert.ok(panel.footer?.some(b => b.command === '/劫云榜'));
});

test('charging preparation shows strike time instead of an expired confirmation window', () => {
  const panel = tribulationPreparationPanel({ tribulationPreparation: { ...overview.tribulationPreparation, status: 'charging', canStart: false, strikeAt: '2026-10-01T01:30:00Z' } });
  assert.match(lines(panel), /落雷：2026-10-01 09:30:00/);
  assert.doesNotMatch(lines(panel), /确认截止|开放：/);
});

test('confirmation retains cost and irreversible risk beside the original write command', async t => {
  const pending = { eventId: 7, status: 'charging', grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion, confirmedAt: '2026-10-01T01:00:00Z', strikeAt: '2026-10-01T01:30:00Z', refunded: false };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid,
    (request.body.arguments as { kind: string }).kind === 'confirm' ? { confirmation, materialNames: { 10: '渡劫石' } } : pending));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫评级 7 high', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const markdown = message.nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown);
  const quote = markdown.value.find(node => node.type === 'MD.blockquote' && Array.isArray(node.value) && JSON.stringify(node.value).includes(tribulationStartCommand(confirmation)));
  assert.ok(quote && quote.type === 'MD.blockquote' && Array.isArray(quote.value));
  const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
  for (const value of ['渡劫石 ×1', '按当前修为预估，失败后剩余：90', '落雷时修为保留90%', '等待期间新增修为也计入', '生命、灵力与复活次数不重置', '确认开始即扣材料', '30分钟后落雷', '系统取消返还', '成功或失败后6小时']) assert.ok(view.text.includes(value), value);
  assert.ok(view.commands.includes(tribulationStartCommand(confirmation)));
  const restored = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫结算 7', platform: 'qq-bot' }));
  assert.equal(restored.messages.length, 1);
  const restoredMessage = restored.messages[0];
  assert.equal(restored.actions[restoredMessage.actionIndex].results?.[0].code, ResultCode.Ok);
  const restoredView = inspectMessage(restoredMessage.nodes);
  assert.doesNotMatch(restoredView.text, /事件：|北京时间/);
  assert.ok(restoredView.commands.includes('/渡劫结算 7'));
});


test('wrapped confirmation digests retain event IDs and exact signed versions', () => {
  const version = 'a'.repeat(64);
  const wrapped = version.slice(0, 48) + '\n' + version.slice(48);
  assert.deepEqual(parseTribulationCommand('/心魔回答 227 accept ' + wrapped), { kind: 'heartAnswer', eventId: 227, choice: 'accept', policyVersion: version });
  assert.deepEqual(parseTribulationCommand('/渡劫开劫 227 high 1.01 ' + wrapped), { kind: 'start', eventId: 227, input: { grade: 'high', attackMultiplier: 1.01, conditionVersion: version } });
  assert.equal(parseTribulationCommand('/心魔回答 227 accept ' + version + 'garbage'), null);
});

test('wrapped start confirmation reaches the business API with the original event ID', async t => {
  const requests: unknown[] = [];
  const { app } = await gameFixture(t, request => {
    requests.push(request.body.arguments);
    return businessEnvelope(request.bid, receipt);
  });
  const version = 'a'.repeat(64);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/渡劫开劫 227 high 1.01 ' + version.slice(0, 48) + '\n' + version.slice(48), platform: 'qq-bot' }));
  assert.deepEqual(requests, [{ kind: 'start', eventId: 227, input: { grade: 'high', attackMultiplier: 1.01, conditionVersion: version } }]);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('confirmation buttons compact full digests and accept historical grouped versions', () => {
  const generated = tribulationStartCommand(confirmation);
  assert.match(generated, /s[A-Za-z0-9_-]{66}$/);
  assert.ok([...generated].length <= 80);
  assert.deepEqual(parseTribulationCommand(generated.replace(/-/g, '-\u200b')), { kind: 'start', eventId: 7, input: { grade: confirmation.grade, attackMultiplier: confirmation.attackMultiplier, conditionVersion: confirmation.conditionVersion } });
  const version = 'a'.repeat(64);
  const grouped = version.match(/.{8}/g)!.join('-');
  assert.deepEqual(parseTribulationCommand('/心魔回答 227 accept ' + grouped.replace(/-/g, '-\u2060')), { kind: 'heartAnswer', eventId: 227, choice: 'accept', policyVersion: version });
  assert.equal(parseTribulationCommand('/心魔回答 227 accept ' + grouped.slice(1)), null);
});

test('confirmation commands retain full digests at maximum safe event ID', () => {
  const version = 'ff'.repeat(32);
  const command = tribulationStartCommand({ ...confirmation, eventId: Number.MAX_SAFE_INTEGER, grade: 'high', attackMultiplier: 1.0300000000000002, conditionVersion: version });
  assert.ok([...command].length <= 80);
  assert.equal(parseTribulationCommand(command)?.kind, 'start');
  assert.equal(parseTribulationCommand(command.slice(0, -1)), null);
  const answer = `/心魔回答 ${Number.MAX_SAFE_INTEGER} accept v${Buffer.from(version, 'hex').toString('base64url')}`;
  assert.ok([...answer].length <= 80);
  assert.deepEqual(parseTribulationCommand(answer), { kind: 'heartAnswer', eventId: Number.MAX_SAFE_INTEGER, choice: 'accept', policyVersion: version });
});

test('compact start confirmation reaches the business API without changing the preview', async t => {
 const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { eventId: 7, status: 'charging', grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion, confirmedAt: '2026-10-01T01:00:00Z', strikeAt: '2026-10-01T01:30:00Z', refunded: false }));
 const result = await app.runHandler(handler, app.events.privateMessage({ text: tribulationStartCommand(confirmation), platform: 'qq-bot' }));
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 assert.deepEqual(requests[0].body.arguments, { kind: 'start', eventId: 7, input: { grade: 'high', attackMultiplier: 1.2, conditionVersion: confirmation.conditionVersion } });
});

test('compact confirmation preserves all grades and rejects invalid generation inputs', () => {
 for (const grade of ['low', 'standard', 'high'] as const) {
  const c = { ...confirmation, grade, eventId: Number.MAX_SAFE_INTEGER, attackMultiplier: 1.0300000000000002 };
  const command = tribulationStartCommand(c);
  assert.equal([...command].length, 73);
  assert.deepEqual(parseTribulationCommand(command), { kind: 'start', eventId: c.eventId, input: { grade, attackMultiplier: c.attackMultiplier, conditionVersion: c.conditionVersion } });
 }
 assert.throws(() => tribulationStartCommand({ ...confirmation, conditionVersion: 'a'.repeat(63) }));
 assert.throws(() => tribulationStartCommand({ ...confirmation, attackMultiplier: NaN }));
});
