import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { logger, toLegacyActionData, withEventContext } from 'alemonjs';
import { register } from '../../node_modules/@alemonjs/qq-bot/lib/register.js';
import { getDirectSend, setDirectSend } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import current from '../../src/response/strategy';
import before from './strategy-before';
import { StaticFileBytesCache } from '../../src/utils/staticFileBytes';
import { mockBackendConfig } from '../backend-config-helper';
import { createBackendRequestContext } from '../../src/api/bot/context';
import type { GameEvent } from '../../src/types/event';

const file = fileURLToPath(new URL('../../src/assets/images/guild.png', import.meta.url));
const clean = (value: unknown) => JSON.parse(JSON.stringify(value));
function setup(t: TestContext) {
  mockBackendConfig(t, { log_transport_timings: true });
  const facts: { stage?: string; requestId?: string; outcome?: string; spanSequence?: number }[] = [];
  t.mock.method(logger, 'info', (_label: string, fact: (typeof facts)[number]) => { if (fact?.stage) facts.push(fact); });
  t.mock.method(logger, 'warn', () => {});
  t.mock.method(logger, 'error', () => {});
  let calls: unknown[] = [];
  let mode = 'ok';
  const upload = async (target: string, body: { file_data?: string }) => {
    calls.push({ phase: 'upload', target, body: clean({ ...body, file_data: body.file_data ? createHash('sha256').update(body.file_data).digest('hex') : undefined }) });
    if (mode === 'upload-error') throw new Error('synthetic-upload-error');
    return { file_info: 'synthetic-file', ttl: 60 };
  };
  const send = async (target: string, body: unknown) => {
    calls.push({ phase: 'send', target, body: clean(body) });
    if (mode === 'send-error') throw new Error('synthetic-send-error');
    return { id: 'synthetic-message', timestamp: 123, ext_info: { ref_idx: 'synthetic-ref' } };
  };
  const fake = { on: () => {}, postRichMediaByGroup: upload, postRichMediaByUser: upload, groupOpenMessages: send, usersOpenMessages: send };
  const adapter = register(fake as never, { botId: 'synthetic-bot', bindActions: false, cbp: { send: () => {} } as never });
  const original = getDirectSend();
  let last: Promise<unknown> | undefined;
  const formats: unknown[] = [];
  setDirectSend(raw => {
    const envelope = raw as { id: string; payload: { input: { params: { format: unknown } } } };
    formats.push(envelope.payload.input.params.format);
    last = new Promise(resolve => queueMicrotask(() => void adapter.onAction(toLegacyActionData({ ...envelope.payload, id: envelope.id } as never), results => {
      const complete = actionRequestResolves.get(envelope.id);
      clearTimeout(actionRequestTimeouts.get(envelope.id));
      actionRequestTimeouts.delete(envelope.id);
      actionRequestResolves.delete(envelope.id);
      assert.ok(complete);
      complete(results);
      // Let SDK bookkeeping and the bot's platform.send span finish before checking logs.
      setImmediate(() => resolve(clean(results)));
    })));
  });
  t.after(() => setDirectSend(original as never));
  return { facts, formats, setMode: (value: string) => { mode = value; }, run: async (handler: typeof current | typeof before, e: GameEvent) => {
    calls = []; last = undefined;
    await withEventContext(e, () => {}, () => handler.current(e as never));
    assert.ok(last);
    const result = await last;
    return { calls: structuredClone(calls), result };
  } };
}
let serial = 0;
function event(scope: string, tag?: string, platform = 'qq-bot'): GameEvent {
  return { name: 'message.create', Platform: platform, BotId: 'synthetic-bot', Target: { scope, targetId: 'synthetic-target' },
    ChannelId: 'synthetic-target', UserId: 'synthetic-target', MessageId: `synthetic-reply-${++serial}`, EventId: 'synthetic-event', _tag: tag,
    IsPrivate: scope === 'c2c', MessageText: '/攻略' } as unknown as GameEvent;
}

test('actual handler warm file reads2→1 without reducing uploads/messages or target isolation', async t => {
  const s = setup(t);
  let reads=0;
  const originalRead=fs.readFileSync;
  t.mock.method(fs,'readFileSync',((path: unknown,...args: unknown[])=>{
    if(path===file)reads++;
    return (originalRead as (...args: unknown[])=>unknown)(path,...args);
  }) as typeof originalRead);
  syncBuiltinESMExports();
  t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
  const originalBytes=(StaticFileBytesCache.prototype as unknown as {readBytes:()=>Promise<Buffer>}).readBytes;
  let asyncReads=0;
  t.mock.method(StaticFileBytesCache.prototype as unknown as {readBytes:()=>Promise<Buffer>},'readBytes',async function(this: StaticFileBytesCache){asyncReads++;return await originalBytes.call(this);});
  const a=event('group','GROUP_AT_MESSAGE_CREATE');
  const b=event('c2c','C2C_MESSAGE_CREATE');
  const oldA=await s.run(before,a);const oldB=await s.run(before,b);
  const newA=await s.run(current,a);const newB=await s.run(current,b);
  assert.deepEqual(newA,oldA);assert.deepEqual(newB,oldB);
  assert.equal(reads,2);assert.equal(asyncReads,1);
  assert.equal(newA.calls.length+newB.calls.length,4);
});

test('actual old/current攻略 handlers through registered QQ adapter: full payload/results/errors/replies and original trace IDs', async t => {
  const s = setup(t);
  for (const scope of ['group', 'c2c']) for (const tag of [undefined, scope === 'group' ? 'GROUP_AT_MESSAGE_CREATE' : 'C2C_MESSAGE_CREATE', scope === 'group' ? 'GROUP_ADD_ROBOT' : 'FRIEND_ADD', 'INTERACTION_CREATE', scope === 'group' ? 'GROUP_MEMBER_ADD' : 'C2C_MSG_REJECT']) for (const failure of ['ok', 'upload-error', 'send-error']) {
    s.setMode(failure);
    const e = event(scope, tag);
    assert.deepEqual(await s.run(current, e), await s.run(before, e));
    const requestId = createBackendRequestContext(e).requestId;
    const sends = s.facts.filter(f => f.stage === 'platform.send' && f.requestId === requestId);
    const loads = s.facts.filter(f => f.stage === 'image.file_load' && f.requestId === requestId);
    assert.equal(sends.length, 2);
    assert.equal(loads.length, 1);
    assert.equal(loads[0].outcome, 'fulfilled');
    assert.ok(loads[0].spanSequence! < sends[0].spanSequence!);
  }
  // Bot-only preparation failure falls back to the exact original Format sender, never a second message.
  t.mock.method(StaticFileBytesCache.prototype, 'load', async () => { throw new Error('synthetic preparation failure'); });
  for (const failure of ['ok', 'upload-error', 'send-error']) {
    s.setMode(failure);
    const e = event('group', 'GROUP_AT_MESSAGE_CREATE');
    assert.deepEqual(await s.run(current, e), await s.run(before, e));
    const loads = s.facts.filter(f => f.stage === 'image.file_load' && f.requestId === createBackendRequestContext(e).requestId);
    assert.equal(loads.length, 1);
    assert.equal(loads[0].outcome, 'rejected');
  }
});

test('current handler only substitutes bytes for QQ group/c2c; other platform/scope keeps frozen Format', async t => {
  const s = setup(t);
  for (const [platform, scope] of [['onebot', 'group'], ['qq-bot', 'channel'], ['qq-bot', 'direct'], ['qq-bot', 'user']]) {
    const e = event(scope, 'GROUP_AT_MESSAGE_CREATE', platform);
    await s.run(current, e); const actualFormat = s.formats.at(-1);
    await s.run(before, e);
    assert.deepEqual(actualFormat, s.formats.at(-1));
    assert.equal(s.facts.filter(f => f.stage === 'image.file_load' && f.requestId === createBackendRequestContext(e).requestId).length, 0);
  }
  for (const scope of ['group', 'c2c']) {
    const e = event(scope, 'GROUP_AT_MESSAGE_CREATE');
    await s.run(current, e);
    const format = s.formats.at(-1) as { type: string }[];
    assert.equal(format[0].type, 'Image');
  }
});
