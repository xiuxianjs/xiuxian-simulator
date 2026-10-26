import { ResultCode } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../src/response/tribulation/publicRes';
import participationHandler from '../src/response/tribulation/res';
import { businessEnvelope, gameFixture } from './framework/fixture';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { createClient } from '../src/api/core';
import { BackendAPIError } from '../src/api/bot/client';
import { cultivationOperationDefinitions } from '../src/api/domains/cultivation/operations';
import { parsePublicTribulationEvent, parsePublicTribulationList, type PublicTribulationEvent } from '../src/api/schemas/public-tribulation';
import { parsePublicTribulationCommand, runPublicTribulationCommand } from '../src/response-apps/tribulation/public';
import { renderTribulationPanel } from '../src/response/tribulation/render';

const event: PublicTribulationEvent = { eventId: 7, playerId: 101, name: '张  三', currentRealm: '化神圆满', targetRealm: '洞虚', targetStage: 5, tribulationName: '四九雷劫', requiredAttempts: 3, status: 'preparing', opensAt: '2026-10-01T01:00:00Z', deadline: '2026-10-01T07:00:00Z', interactionOpen: false, canStart: false };
type Api = NonNullable<Parameters<typeof runPublicTribulationCommand>[2]>;
const api = (overrides: Partial<Api> = {}): Api => ({ list: async () => [event], observe: async () => event, ...overrides });
const strings = (panel: Awaited<ReturnType<typeof runPublicTribulationCommand>>) => [...panel.sections.flatMap(section => section.lines), ...(panel.sections.length ? [] : [panel.emptyText ?? ''])].join('\n');
const buttons = (panel: Awaited<ReturnType<typeof runPublicTribulationCommand>>) => [...panel.sections.flatMap(section => section.buttons ?? []), ...(panel.footer ?? []), ...(panel.header ?? [])];

test('public SDK route and query metadata match actual OpenAPI', () => {
  const document = YAML.parse(readFileSync('../xiuxian-game-server/docs/openapi.yaml', 'utf8'));
  for (const id of ['get_tribulation_events', 'get_tribulation_events_eventId'] as const) {
    const definition = cultivationOperationDefinitions[id];
    const operation = document.paths[definition.path.replace('/api/v1', '')].get;
    assert.equal(operation.operationId, id);
    assert.equal(definition.method, 'GET');
    assert.equal(definition.bodyRequired, false);
    assert.deepEqual(operation.parameters.filter((p: { in: string }) => p.in === 'query').map((p: { name: string }) => p.name), definition.queryParams.map(p => p.name));
    for (const parameter of definition.queryParams) {
      assert.deepEqual(parameter.schema, operation.parameters.find((p: { name: string }) => p.name === parameter.name).schema);
    }
  }
});
test('public parser strips all unreviewed private data and rejects unsupported actions or malformed status', () => {
  const leaked = { ...event, attackLimit: { maxMultiplier: 1.03, changes: [{base:99,before:199,after:101}] }, karma: { currentShaQi: 20 }, heartDemon: {sourceEventId:99, choice:'guard', title:'private-story'}, evasion: {level:3}, materials: ['private-cost'], progress: { successful: 2 }, experienceBefore: 900, conditions: { conditionVersion: 'private-version' }, seed: 123, battle: { summary: 'private-battle' } };
  assert.deepEqual(parsePublicTribulationEvent(leaked), event);
  assert.deepEqual(parsePublicTribulationList([leaked]), [event]);
  assert.throws(() => parsePublicTribulationEvent({ ...event, canStart: true }));
  assert.throws(() => parsePublicTribulationEvent({ ...event, interactionOpen: true }));
  assert.throws(() => parsePublicTribulationEvent({ ...event, status: 'unknown' }));
  assert.throws(() => parsePublicTribulationList({ data: [event] }));
});
test('UID and complete-name searches are explicit, preserve internal spaces, and reject unsafe pagination', () => {
  assert.deepEqual(parsePublicTribulationCommand('/搜索劫云 UID 101'), { kind: 'list', page: 1, filter: { playerId: 101 } });
  assert.deepEqual(parsePublicTribulationCommand('/搜索劫云 道号 张  三'), { kind: 'list', page: 1, filter: { name: '张  三' } });
  assert.deepEqual(parsePublicTribulationCommand('/劫云榜 2 道号 101'), { kind: 'list', page: 2, filter: { name: '101' } });
  for (const command of ['/劫云榜 0', '/劫云榜 9007199254740991', '/搜索劫云 UID -1', '/搜索劫云 UID platform-account', '/观望渡劫 0', '/观望渡劫 7 extra', '/搜索劫云 道号 张\n三']) assert.equal(parsePublicTribulationCommand(command), null);
});
test('five-row pages use a sentinel, preserve name filters, and provide only read actions', async () => {
  const queries: unknown[] = [];
  const backend = api({ list: async (_bid, query) => { queries.push(query); return Array.from({ length: 6 }, (_, i) => ({ ...event, eventId: i + 1 })); } });
  const panel = await runPublicTribulationCommand('/搜索劫云 道号 张  三', 'viewer', backend);
  assert.deepEqual(queries[0], { name: '张  三', offset: 0, limit: 6 });
  assert.equal(panel.sections.filter(section => section.lines[0].startsWith('【')).length, 5);
  assert.equal(panel.nav?.current, 1);
  assert.equal(panel.nav?.hasNext, true);
  assert.equal(panel.nav?.command, '/劫云榜 {page} 道号 张  三');
  await runPublicTribulationCommand('/劫云榜 2 道号 张  三', 'viewer', backend);
  assert.deepEqual(queries[1], { name: '张  三', offset: 5, limit: 6 });
  assert.ok(buttons(panel).every(button => !/开劫|评级|护法|捣乱/.test(button.command)));
  assert.ok(!strings(panel).includes('累计成功'));
});
test('last and empty pages do not invent a next page or infer offline/private player status', async () => {
  const last = await runPublicTribulationCommand('/劫云榜 2', 'viewer', api({ list: async () => Array.from({ length: 5 }, () => event) }));
  assert.equal(last.nav?.hasNext, false);
  assert.equal(last.nav?.current, 2);
  assert.equal(last.nav?.command, '/劫云榜 {page}');
  const empty = await runPublicTribulationCommand('/搜索劫云 UID 101', 'viewer', api({ list: async () => [] }));
  assert.match(strings(empty), /当前没有匹配的可观望渡劫事件/);
  assert.ok(!/离线|闭关|失败/.test(strings(empty)));
});
test('observe refresh reads the same event and distinguishes a successful attempt from promotion and expiry', async () => {
  const calls: unknown[][] = [];
  const backend = api({ observe: async (...args) => { calls.push(args); return { ...event, status: 'succeeded' }; } });
  const panel = await runPublicTribulationCommand('/观望渡劫 7', 'viewer', backend);
  assert.deepEqual(calls, [['viewer', 7]]);
  assert.match(strings(panel), /本次渡劫成功/);
  assert.ok(!strings(panel).includes('晋级成功'));
  assert.equal(buttons(panel)[0].command, '/观望渡劫 7');
  const expired = await runPublicTribulationCommand('/观望渡劫 7', 'viewer', api({ observe: async () => ({ ...event, status: 'expired' }) }));
  assert.match(strings(expired), /未开劫，确认已超时/);
  assert.ok(!strings(expired).includes('渡劫失败'));
});
test('unavailable and missing public events report the actual error without pretending the list is empty', async () => {
  const unavailable = await runPublicTribulationCommand('/劫云榜', 'viewer', api({ list: async () => { throw new BackendAPIError('database details', 'UNAVAILABLE', 503); } }));
  assert.equal(unavailable.title, '劫云查询未完成');
  assert.ok(!strings(unavailable).includes('database details'));
  assert.ok(!strings(unavailable).includes('没有匹配'));
  const missing = await runPublicTribulationCommand('/观望渡劫 7', 'viewer', api({ observe: async () => { throw new BackendAPIError('没有可观望的渡劫事件', 'NOT_FOUND', 404); } }));
  assert.match(strings(missing), /没有可观望的渡劫事件/);
});
test('real SDK encodes exact filters using GET and the viewer identity, never a target player write', async () => {
  const urls: URL[] = [];
  const client = createClient({ baseUrl: 'https://backend.invalid', identity: { kind: 'robot', token: 'test-only', bid: 'viewer' }, adapter: async config => {
    assert.equal(config.method?.toUpperCase(), 'GET');
    assert.equal(config.data, undefined);
    assert.equal(config.headers.get('X-Bid'), 'viewer');
    urls.push(new URL(config.url!));
    return { status: 200, statusText: 'OK', headers: {}, config, data: JSON.stringify({ data: config.url!.includes('/7') ? event : [event] }) };
  } });
  await client.request('get_tribulation_events', { query: { name: '张  三', offset: 5, limit: 6 } });
  await client.request('get_tribulation_events_eventId', { path: { eventId: 7 } });
  assert.equal(urls[0].searchParams.get('name'), '张  三');
  assert.equal(urls[0].searchParams.get('offset'), '5');
  assert.equal(urls[1].pathname, '/api/v1/tribulation-events/7');
  await assert.rejects(() => client.request('get_tribulation_events', { query: { offset: -1 } }));
  assert.equal(urls.length, 2);
});
test('native observation bubble includes its action but no injected private fields or settlement buttons', async () => {
  const leaked = { ...event, materials: ['private-cost'], progress: { successful: 2 }, conditions: { conditionVersion: 'private-version' }, battle: { summary: 'private-battle' } };
  const panel = await runPublicTribulationCommand('/观望渡劫 7', 'viewer', api({ observe: async () => leaked }));
  const serialized = JSON.stringify(renderTribulationPanel(panel, { isPrivate: true }).format.value);
  assert.ok(serialized.includes('/观望渡劫 7'));
  for (const secret of ['private-cost', 'private-version', 'private-battle', '/渡劫开劫', '/渡劫结算']) assert.ok(!serialized.includes(secret));
});

test('disabled public query reports unavailable feature without pretending the list is empty', async () => {
  for (const [code, message] of [['TRIBULATION_EVENTS_DISABLED', 'ignored'], ['SERVICE_UNAVAILABLE', '新渡劫事件与观望尚未开放']]) {
    const panel = await runPublicTribulationCommand('/劫云榜', 'viewer', api({ list: async () => { throw new BackendAPIError(message, code, 503); } }));
    assert.match(strings(panel), /新渡劫尚未开放/);
    assert.ok(!strings(panel).includes('没有匹配'));
  }
});
test('charging observation displays a guarded disruption action with public capped effect',async()=>{
 const charging:PublicTribulationEvent={...event,status:'charging',strikeAt:'2026-10-01T01:30:00Z',interactionOpen:true,disruption:{count:1,attackBonusPercent:1}};
 assert.deepEqual(parsePublicTribulationEvent(charging),charging);
 const panel=await runPublicTribulationCommand('/观望渡劫 7','viewer',api({observe:async()=>charging}));
 assert.equal(buttons(panel).find(b=>b.label==='捣乱')?.command,'/捣乱渡劫 7');
 assert.match(strings(panel),/无物品或货币成本/);
});
test('native charging bubble keeps the disruption cost and button inside its quote', async t => {
 const charging: PublicTribulationEvent = { ...event, status: 'charging', strikeAt: '2026-10-01T01:30:00Z', interactionOpen: true, disruption: { count: 1, attackBonusPercent: 1 } };
 const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, charging));
 const result = await app.runHandler(handler, app.events.privateMessage({ text: '/观望渡劫 7', platform: 'qq-bot' }));
 assert.equal(requests.length, 1);
 assert.equal(result.messages.length, 1);
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const markdown = message.nodes.find(node => node.type === 'Markdown');
 assert.ok(markdown);
 const quote = markdown.value.find(node => node.type === 'MD.blockquote' && JSON.stringify(node).includes('/捣乱渡劫 7'));
 assert.ok(quote && quote.type === 'MD.blockquote' && Array.isArray(quote.value));
 const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
 assert.match(view.text, /无物品或货币成本/);
 assert.ok(view.commands.includes('/捣乱渡劫 7'));
});

test('participation is an explicit write action only in the supported paid window', async () => {
 const open={...event,status:'charging' as const,strikeAt:'2026-10-01T01:30:00Z',interactionOpen:true,participationOpen:true};
 const panel=await runPublicTribulationCommand('/观望渡劫 7','viewer',api({observe:async()=>open}));
 assert.ok(buttons(panel).some(b=>b.command==='/参与观望 7'));
 const definition=cultivationOperationDefinitions.post_players_id_tribulation_events_eventId_participate;
 const document=YAML.parse(readFileSync('../xiuxian-game-server/docs/openapi.yaml','utf8'));
 assert.equal(definition.method,'POST');
 assert.equal(document.paths[definition.path.replace('/api/v1','')].post.operationId,'post_players_id_tribulation_events_eventId_participate');
});

test('active list cards participate directly and return credited experience', async t => {
  const open: PublicTribulationEvent = { ...event, status: 'charging', strikeAt: '2026-10-01T01:30:00Z', interactionOpen: true, participationOpen: true, disruption: { count: 2, attackBonusPercent: 2 } };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, (request.body.arguments as { kind: string }).kind === 'list' ? [open] : { eventId: 7, participated: true, reward: { baseExperience: 10, creditedExperience: 10, dailyRewarded: 1, dailyLimit: 3, rewardDate: '2026-10-21', reason: 'granted', repeated: false } }));
  const list = await app.runHandler(handler, app.events.privateMessage({ text: '/劫云榜', platform: 'qq-bot' }));
  assert.equal(list.messages.length, 1);
  const message = list.messages[0];
  assert.equal(list.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const markdown = message.nodes.find(node => node.type === 'Markdown'); assert.ok(markdown);
  const card = markdown.value.find(node => node.type === 'MD.blockquote'); assert.ok(card && Array.isArray(card.value));
  assert.equal(card.value.filter(node => node.type === 'MD.text' && typeof node.value === 'string' && node.value.trim()).length, 5);
  const view = inspectMessage([{ type: 'Markdown', value: card.value }]);
  assert.match(view.text, /落雷：2026-10-01 09:30:00/);
  assert.deepEqual(view.commands, ['/参与观望 7', '/捣乱渡劫 7']);
  assert.match(view.text, /捣乱会增强对方雷劫，并可能计入自身渡劫因果/);
  assert.ok(card.value.some(node => node.type === 'MD.button' && node.value === '‹观望›'));
  assert.doesNotMatch(view.text, /平台账号|截止时间及事件编号排序|来源|北京时间|确认截止|不披露/);
  const result = await app.runHandler(participationHandler, app.events.privateMessage({ text: view.commands[0], platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const detail = result.messages[0];
  assert.equal(result.actions[detail.actionIndex].results?.[0].code, ResultCode.Ok);
  const detailView = inspectMessage(detail.nodes);
  assert.match(detailView.text, /修为 \+10，已即时到账/);
  assert.ok(detailView.commands.includes('/劫云榜'));
  assert.ok(!detailView.commands.includes('/观望渡劫 7'));
});
