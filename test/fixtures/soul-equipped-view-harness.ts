import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import axios from 'axios';
import { getConfig, logger, withEventContext } from 'alemonjs';
import { getDirectSend, setDirectSend } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import current from '../../src/response/soulArtifact/info/res';
import detail from '../../src/response/soulArtifact/detail/res';
import frozen from './soul-equipped-res-before';
import { getBackendSoulArtifactOverview } from '../../src/api/bot/soul-artifact-overview-queries';

const clone = (value: any) => JSON.parse(JSON.stringify(value));
function item(id = 1) {
  return { instanceId: id, artifactId: 7, name: '测试本命物', category: '全能', positioning: '护持', gradeId: 3, gradeName: '灵器', level: 7, washCount: 2, hasUpgraded: false, isEquipped: true, lockStatus: 0, statusText: '已炼化', washQuality: 'normal', washQualityText: '普通', maxAffixCount: 5,
    basePanels: [{ key: 'patk', name: '物攻', value: 10 }], panels: [{ key: 'critRate', name: '暴击率', washBonus: 2.345, washCap: 3.567, affixType: 'main', affixTypeName: '主', isPercent: true }],
    capabilities: [{ kind: 'upgradeLevel', available: true, instanceId: id, maxLevels: 6, requiredItemId: 70, requiredQuantity: 100, availableQuantity: 1000 }, { kind: 'wash', available: true, instanceId: id, maxLevels: 1, requiredItemId: 71, requiredQuantity: 1, availableQuantity: 1 }, { kind: 'unequip', available: true, instanceId: id }, { kind: 'gradeUpgrade', available: true, instanceId: id, requiredQuantity: 5, availableQuantity: 8 }] };
}
function project(full: any) {
  const selected = full.equippedInstanceId === null ? undefined : full.items.findLast((i: any) => i.instanceId === full.equippedInstanceId);
  return { ...clone(full), hasDisplayItems: full.items.length > 0, items: selected ? [clone(selected)] : [] };
}

test('equipped view preserves full frozen info bubbles, identity, fallback, selected strictness and detail default', async t => {
  t.mock.getter(getConfig(), 'value', () => ({ 'xiuxian-game': { backend: { api_url: 'https://soul-equipped.test', robot_auth_token: 'synthetic-only' } } }));
  for (const method of ['info', 'warn', 'error'] as const) t.mock.method(logger, method, () => {});
  let raw: any, status = 200, calls: any[] = [], format: any, supportsView = true, overrideMetadata: any = undefined, last: any;
  t.mock.method(axios, 'create', () => ({ request: async (config: any) => {
    calls.push({ url: config.url, method: config.method, headers: clone(config.headers) });
    const narrow = new URL(config.url).searchParams.get('view') === 'equipped';
    let data = narrow && supportsView ? project(raw) : raw;
    if (narrow && overrideMetadata !== undefined) data = { ...data, hasDisplayItems: overrideMetadata };
    return { status, headers: {}, data: JSON.stringify(status === 200 ? { data } : { error: { code: 'SYNTHETIC_FAILURE', message: '测试失败' } }) };
  } }));
  const oldSend = getDirectSend(); t.after(() => { if (oldSend) setDirectSend(oldSend); });
  setDirectSend((envelope: any) => {
    format = clone(envelope.payload.input.params.format);
    last = new Promise(resolve => queueMicrotask(() => {
      const done = actionRequestResolves.get(envelope.id);
      clearTimeout(actionRequestTimeouts.get(envelope.id)); actionRequestTimeouts.delete(envelope.id); actionRequestResolves.delete(envelope.id);
      done?.([{ code: 2000, message: 'synthetic', data: {} }]); setImmediate(resolve);
    }));
  });
  let serial = 0; const fixtures: any[] = [];
  const event = (privateChat = false, text = '/本命物信息') => ({ name: 'message.create', Platform: 'qq-bot', BotId: 'synthetic-bot', UserId: 'synthetic-one', uid: 1, MessageText: text, MessageId: `synthetic-${++serial}`, isPrivate: privateChat, Target: { scope: privateChat ? 'c2c' : 'group', targetId: 'synthetic-target' } });
  const run = async (handler: any, e: any) => { calls = []; format = undefined; last = undefined; await withEventContext(e, () => {}, () => handler.current(e)); if (last) await last; return { calls: clone(calls), format }; };
  for (const variant of ['equipped', 'empty', 'not-equipped', 'listed', 'locked', 'last-equipped', 'no-level', 'selected-badnumeric', 'global-badlevel', 'global-badcapability', '401', '404', '500', 'inventory-20', 'inventory-200']) {
    for (const privateChat of [false, true]) {
      const selected = item(); raw = { items: [selected], realmLevel: 20, realmStageLevel: 4, equippedInstanceId: 1, capabilities: [{ kind: 'soulPath', available: true }] };
      if (variant === 'empty') { raw.items = []; raw.equippedInstanceId = null; }
      if (variant === 'not-equipped') { selected.isEquipped = false; raw.equippedInstanceId = null; }
      if (variant === 'listed') { selected.lockStatus = 2; selected.capabilities = [{ kind: 'gradeUpgrade', available: false, instanceId: 1, reasonCode: 'listed' }] as any; }
      if (variant === 'locked') selected.lockStatus = 1;
      if (variant === 'last-equipped') { raw.items.push(item(2)); raw.equippedInstanceId = 2; }
      if (variant === 'no-level') raw.realmLevel = null;
      if (variant === 'selected-badnumeric') raw.items[0].panels[0].washBonus = 'bad';
      if (variant === 'global-badlevel') raw.realmLevel = 'bad';
      if (variant === 'global-badcapability') raw.capabilities = [{ kind: 'unknown', available: true }];
      if (variant.startsWith('inventory-')) raw.items = Array.from({ length: Number(variant.split('-')[1]) }, (_, i) => ({ ...item(i + 1), isEquipped: i === 0 }));
      status = /^\d+$/.test(variant) ? Number(variant) : 200;
      const e = event(privateChat), before = await run(frozen, e), after = await run(current, e);
      assert.deepEqual(after.format, before.format, variant);
      assert.equal(before.calls.length, 1); assert.equal(after.calls.length, 1);
      assert.equal(new URL(before.calls[0].url).search, ''); assert.equal(new URL(after.calls[0].url).searchParams.get('view'), 'equipped');
      assert.deepEqual(after.calls[0].headers, before.calls[0].headers, 'bearer/bid/request context preserved');
      fixtures.push({ variant, privateChat, format: before.format });
    }
  }
  status = 200;
  // Older service ignores new view: no metadata and full items must retain both branches.
  supportsView = false;
  for (const present of [false, true]) {
    raw = { items: present ? [{ ...item(), isEquipped: false }] : [], realmLevel: 20, realmStageLevel: 4, equippedInstanceId: null, capabilities: [] };
    const e = event(); assert.deepEqual((await run(current, e)).format, (await run(frozen, e)).format);
  }
  supportsView = true;
  raw = { items: [item()], realmLevel: 20, realmStageLevel: 4, equippedInstanceId: 1, capabilities: [] };
  overrideMetadata = 'false'; await assert.rejects(() => getBackendSoulArtifactOverview('synthetic-one', 1, 'equipped')); overrideMetadata = null;
  await assert.rejects(() => getBackendSoulArtifactOverview('synthetic-one', 1, 'equipped')); overrideMetadata = undefined;
  // Default helper/detail does not request equipped and retains strict parsing of ALL items.
  calls = []; await getBackendSoulArtifactOverview('synthetic-one', 1); assert.equal(new URL(calls[0].url).search, '');
  const detailed = await run(detail, event(false, '/本命物详情 1')); assert.equal(new URL(detailed.calls[0].url).search, '');
  for (const [name, mutate] of [['badnumeric', (i: any) => i.panels[0].washBonus = 'bad'], ['metadata', (i: any) => i.category = null], ['quality', (i: any) => i.washQuality = 'unknown'], ['capability', (i: any) => i.capabilities = [{ kind: 'unknown', available: true }]]] as const) {
    const selected = item(), other = item(2); mutate(other); raw.items = [selected, other];
    const e = event(); const before = await run(frozen, e), after = await run(current, e);
    assert.notDeepEqual(after.format, before.format, `accepted nonselected ${name} isolation`);
    calls = []; await assert.rejects(() => getBackendSoulArtifactOverview('synthetic-one', 1));
  }
  await assert.rejects(() => getBackendSoulArtifactOverview(undefined, 1, 'equipped'));
  writeFileSync('/tmp/soul-equipped-view-bubble-fixtures.json', JSON.stringify({ source: 'synthetic canonical response fixtures; native public Format send captured, no real QQ', cases: fixtures }, null, 2) + '\n', { mode: 0o600 });
  // Root's real service fixture is optional here, never replaced with a fake real-service claim.
  if (existsSync('/tmp/soul-equipped-view-service-full.json') && existsSync('/tmp/soul-equipped-view-service-equipped.json')) {
    const full = JSON.parse(readFileSync('/tmp/soul-equipped-view-service-full.json', 'utf8'));
    const equipped = JSON.parse(readFileSync('/tmp/soul-equipped-view-service-equipped.json', 'utf8'));
    assert.deepEqual(project(full), equipped);
    raw = full; const e = event(), before = await run(frozen, e), after = await run(current, e); assert.deepEqual(after.format, before.format);
    writeFileSync('/tmp/soul-equipped-view-actual-service-bubble.json', JSON.stringify(before.format, null, 2) + '\n', { mode: 0o600 });
  }
});
