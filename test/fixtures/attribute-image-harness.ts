import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import { Playwright } from '../../node_modules/jsxp/lib/core/playwright/playwright.js';
import { getDirectSend, setDirectSend } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import { mockBackendConfig } from '../backend-config-helper';
import { ImageCache } from '../../src/utils/imageCdn';
import current from '../../src/response/attributes/update/res';
import frozen from './attribute-image-before';
import type { GameEvent } from '../../src/types/event';
const clone = (x: any) => JSON.parse(JSON.stringify(x));
const base = (uid: number): any => ({ daoName: '合成道号', uid, realmName: '筑基', maxAttributeBonus: 5, strength: 6, maxStrength: 10, intelligence: 6, maxIntelligence: 10, constitution: 6, maxConstitution: 10, agility: 6, maxAgility: 10, luck: 6, maxLuck: 10, combatPower: 100, physicalAttack: 10, physicalDefense: 10, magicAttack: 10, magicDefense: 10, spiritualPower: 10, mentalPower: 10, hp: 10, speed: 10, critRate: 10, critDamage: 10, antiCritRate: 10, hitRate: 10, dodgeRate: 10, theme: null, mpRecoveryEfficiency: 5, mentalRecoveryEfficiency: 5, access: { canUseMeridian: true, canUseSoulArtifact: true, canUseSoulPath: false }, resourceRecovery: { configured: true, enabled: true, cap: 100, mpTotal: 5, mentalTotal: 5, mp: 5, mental: 5, sources: [], note: '合成旧说明' } });

test('full frozen handlers preserve HTML, fresh captions/footer, keys, concurrent jobs, TTL and retries', async t => {
  mockBackendConfig(t, { api_url: 'https://attribute-image.test', robot_auth_token: 'synthetic-only', log_transport_timings: true });
  for (const m of ['info', 'warn', 'error'] as const) t.mock.method(logger, m, () => {});
  let now = 2000000000000; t.mock.method(Date, 'now', () => now);
  let data: any, calls = 0, renders = 0, uploads = 0, mode = 'success', hold = false;
  const releases: (() => void)[] = [], htmls: string[] = [], messages: { event: GameEvent; format: any }[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (c: any) => {
    calls++; assert.match(new URL(c.url).pathname, /attribute-panel$/);
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  t.mock.method(Playwright.prototype, 'render', async (html: string) => {
    renders++; htmls.push(html);
    if (hold) await new Promise<void>(resolve => releases.push(resolve));
    if (mode === 'render-reject') throw new Error('synthetic-render-failure');
    return mode === 'render-null' ? null : Buffer.from(html);
  });
  t.mock.method(ImageCache.prototype as unknown as { uploadAppImage: (b: Buffer) => Promise<unknown> }, 'uploadAppImage', async b => {
    uploads++;
    if (mode === 'upload-reject') throw new Error('synthetic-upload-failure');
    if (mode === 'upload-null') return null;
    const url = `https://synthetic.invalid/${createHash('sha256').update(b).digest('hex')}.png`;
    return { imageUrl: url, cdnUrl: url, path: 'synthetic' };
  });
  const prior = getDirectSend(); t.after(() => { if (prior) setDirectSend(prior); });
  setDirectSend(raw => {
    messages.push({ event: raw.payload.input.event as GameEvent, format: clone(raw.payload.input.params.format) });
    setImmediate(() => { clearTimeout(actionRequestTimeouts.get(raw.id)); actionRequestTimeouts.delete(raw.id); const done = actionRequestResolves.get(raw.id); actionRequestResolves.delete(raw.id); done?.([{ code: 2000, message: 'synthetic', data: null }]); });
  });
  let uid = 99000000, serial = 0;
  const event = (id: number, privateChat = false, target = 'synthetic-group', avatar = '') => ({ name: 'message.create', Platform: 'qq-bot', UserId: `synthetic-${id}`, BotId: 'synthetic-bot', uid: id, MessageId: `synthetic-${++serial}`, MessageText: '/属性面板', UserAvatar: avatar, isPrivate: privateChat, Target: { scope: privateChat ? 'c2c' : 'group', targetId: target } }) as unknown as GameEvent;
  const run = async (handler: typeof current, e: GameEvent) => { await withEventContext(e, () => {}, () => handler.current(e as never)); await new Promise<void>(resolve => setImmediate(resolve)); return messages.at(-1)!.format; };
  const reset = () => { calls = renders = uploads = 0; htmls.length = messages.length = 0; };
  const expire = () => { now += 7 * 24 * 3600000 + 1; };
  let completePairs = 0;
  for (const privateChat of [false, true]) {
    data = base(++uid); const e = event(uid, privateChat);
    const before = await run(frozen, e), oldHTML = htmls.at(-1);
    const after = await run(current, e); assert.deepEqual(after, before); assert.equal(htmls.at(-1), oldHTML); completePairs++;
  }
  // Current two ignored-fact changes: API still fresh, caption/footer differs, image is one job.
  data = base(++uid); const e = event(uid); reset(); const initial = await run(current, e);
  data = { ...data, resourceRecovery: { ...data.resourceRecovery, note: '合成新说明' }, access: { ...data.access, canUseSoulPath: true } };
  const fresh = await run(current, event(uid)); assert.match(JSON.stringify(fresh), /合成新说明/); assert.match(JSON.stringify(fresh), /道途印证/); assert.notDeepEqual(fresh, initial); assert.equal(renders, 1); assert.equal(uploads, 1); assert.equal(calls, 2);
  const currentStats = { calls, renders, uploads };
  expire(); reset(); data = base(uid); await run(frozen, e);
  data = { ...data, resourceRecovery: { ...data.resourceRecovery, note: '合成新说明' }, access: { ...data.access, canUseSoulPath: true } };
  const oldFresh = await run(frozen, event(uid)); assert.deepEqual(oldFresh, fresh); assert.equal(renders, 2); assert.equal(uploads, 2); assert.equal(htmls[0], htmls[1]);
  const beforeStats = { calls, renders, uploads };
  writeFileSync('/tmp/attribute-image-fingerprint-bubble.json', JSON.stringify(fresh, null, 2));
  // Every actual rendered API prop retains invalidation; base comparison uses a unique UID each pair.
  const numeric = ['maxAttributeBonus','strength','maxStrength','intelligence','maxIntelligence','constitution','maxConstitution','agility','maxAgility','luck','maxLuck','combatPower','physicalAttack','physicalDefense','magicAttack','magicDefense','spiritualPower','mentalPower','hp','speed','critRate','critDamage','antiCritRate','hitRate','dodgeRate','mpRecoveryEfficiency','mentalRecoveryEfficiency'];
  const changes: [string, any][] = [...numeric.map(k => [k, 99] as [string, any]), ['daoName', '新道号'], ['realmName', '新境界'], ['theme', { name: '合成主题', colors: { primary: '#123456' } }]];
  for (const [field, value] of changes) {
    data = base(++uid); reset(); const e = event(uid); await run(current, e);
    data = { ...data, [field]: value }; const changed = await run(current, event(uid)); assert.equal(renders, 2, field); assert.equal(uploads, 2, field);
    // Frozen handler must produce the complete same Format for the changed props.
    const currentHTML = htmls.at(-1); const old = await run(frozen, event(uid)); assert.deepEqual(old, changed, field); assert.equal(htmls.at(-1), currentHTML, field); completePairs++;
  }
  data = base(++uid); reset(); await run(current, event(uid)); await run(current, event(uid, false, 'another-target', 'https://synthetic.invalid/new-avatar.png')); assert.equal(renders, 2);
  data = base(++uid); await run(current, event(uid)); assert.equal(renders, 3); // UID partitions images.
  // Two events with different caption facts/targets share a job, each still sends its own fresh bubble.
  data = base(++uid); reset(); hold = true;
  const a = run(current, event(uid));
  while (renders !== 1) await new Promise<void>(resolve => setImmediate(resolve));
  data = { ...data, resourceRecovery: { ...data.resourceRecovery, note: '并发最新说明' } };
  const b = run(current, event(uid, true, 'synthetic-private'));
  while (calls !== 2) await new Promise<void>(resolve => setImmediate(resolve));
  await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(renders, 1);
  hold = false; releases.splice(0).forEach(fn => fn()); await Promise.all([a, b]); assert.equal(uploads, 1); assert.equal(messages.length, 2); assert.notDeepEqual(messages[0].format, messages[1].format);
  // Same fingerprint hits until the original seven-day TTL; hit does not extend expiry.
  data = base(++uid); reset(); await run(current, event(uid)); now += 6 * 24 * 3600000; await run(current, event(uid)); assert.equal(renders, 1); now += 24 * 3600000 + 1; await run(current, event(uid)); assert.equal(renders, 2);
  for (const fail of ['render-reject','upload-reject','render-null','upload-null']) {
    data = base(++uid); reset(); mode = fail;
    if (fail.endsWith('reject')) { await assert.rejects(run(current, event(uid))); await assert.rejects(run(current, event(uid))); assert.equal(renders, 2); await assert.rejects(run(frozen, event(uid)), /synthetic-(render|upload)-failure/); }
    else { const first = await run(current, event(uid)); await run(current, event(uid)); assert.equal(renders, 2); const before = await run(frozen, event(uid)); assert.deepEqual(first, before); }
    mode = 'success'; await run(current, event(uid)); const afterRetry = renders; await run(current, event(uid)); assert.equal(renders, afterRetry);
  }
  writeFileSync('/tmp/attribute-image-fingerprint-test-evidence.json', JSON.stringify({ complete_Format_HTML_pairs: completePairs, rendered_API_prop_control_cases: changes.length, before_ignored_changes: beforeStats, after_ignored_changes: currentStats, all_API_fresh: true, concurrent_distinct_events_sends: 2, same_content_public_CDN_only: true, TTL_days_unchanged: 7, failure_retry_modes: 4, actual_browser: false, actual_upload: false, actual_QQ: false, static_asset_imports: 'same build-equivalent paths supplied by existing local test loader' }, null, 2));
});
