import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test, type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios, { AxiosError } from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import community from '../../src/response/notification/community/res';
import * as communityDeliverySource from '../../src/notification/communityDelivery';
import type { CommunityBatch } from '../../src/api/bot/notification-cache';

after(() => shutdownLogger());

const artifact = process.env.XIUXIAN_COMMUNITY_DELIVERY_ARTIFACT;
const { dispatchCommunityNotifications } = artifact
  ? await import(pathToFileURL(artifact).href) as typeof communityDeliverySource
  : communityDeliverySource;

function fixture(t: TestContext) {
  const cwd = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), 'community-receipts-'));
  process.chdir(directory);
  t.after(() => {
    process.chdir(cwd);
    rmSync(directory, { recursive: true, force: true });
  });
  const batches: CommunityBatch[] = [];
  const absent = new Set<string>();
  const unavailableMembers = new Set<string>();
  const memberReads: string[] = [];
  const availabilityBatches: string[][] = [];
  let batchAvailability = false;
  let malformedBatchAvailability = false;
  let concurrentMemberReads = 0;
  let peakMemberReads = 0;
  const receipts = new Map<string, unknown>();
  const leases = new Set<string>();
  const missingReceipts = new Set<string>();
  const writes: Record<string, any>[] = [];
  const finished: Array<{ eventId: string; retry: boolean; deferred?: true }> = [];
  const finishRequests: boolean[] = [];
  const finishConsumers: string[] = [];
  const unavailable = new Set<string>();
  let enabled = true;
  let shopRaidEnabled = false;
  let rejectSend = false;
  let loseClaimResponse = false;
  let lostClaim: CommunityBatch | null = null;
  const claimRequests: Array<{ path: string; body: Record<string, unknown> }> = [];
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: Record<string, any>) {
      if (path.endsWith('/community/finish')) {
        finishRequests.push(body.retry);
        finishConsumers.push(body.consumer);
      }
      if (/\/community\/claim(?:\/recover)?$/.test(path)) claimRequests.push({ path, body });
      if (unavailable.has(path.split('/cache').at(-1)!)) {
        throw new AxiosError('通知缓存暂时失联', 'ERR_BAD_RESPONSE', undefined, undefined, {
          status: 503, data: {}, headers: {}, config: {}
        } as never);
      }
      let data: unknown = null;
      if (path.endsWith('/community/claim')) {
        if (loseClaimResponse) {
          loseClaimResponse = false;
          lostClaim = batches.shift() ?? null;
          throw new AxiosError('模拟失去领取响应', 'ECONNRESET');
        }
        data = batches.shift() ?? null;
      }
      else if (path.endsWith('/community/claim/recover')) {
        data = lostClaim;
      }
      else if (path.endsWith('/community/settings/read')) data = { welcomeEnabled: enabled, requestReminders: false, shopRaidEnabled };
      else if (path.endsWith('/community/settings/write')) { writes.push(body); enabled = body.settings.welcomeEnabled; }
      else if (path.endsWith('/availability/read')) {
        if (Array.isArray(body.memberIds)) {
          availabilityBatches.push(body.memberIds);
          if (batchAvailability) {
            return { data: { data: { memberAvailability: malformedBatchAvailability ? [] : body.memberIds.map(id => !absent.has(id)) } } };
          }
        }
        if (body.memberId) {
          memberReads.push(body.memberId);
          concurrentMemberReads++;
          peakMemberReads = Math.max(peakMemberReads, concurrentMemberReads);
          await new Promise<void>(resolve => setImmediate(resolve));
          concurrentMemberReads--;
          if (unavailableMembers.has(body.memberId)) {
            throw new AxiosError('成员状态暂不可用', 'ERR_BAD_RESPONSE', undefined, undefined, {
              status: 503, data: {}, headers: {}, config: {}
            } as never);
          }
        }
        data = { available: !absent.has(body.memberId), updatedAt: 1 };
      }
      else if (path.endsWith('/permission/probe')) data = { previous: '', acquired: false };
      else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      else if (path.endsWith('/permission/cas') || path.endsWith('/permission/failure')) data = null;
      else if (path.endsWith('/receipt/read')) data = receipts.get(body.eventId) ?? null;
      else if (path.endsWith('/receipt/lease/acquire')) {
        data = { acquired: !leases.has(body.eventId) };
        leases.add(body.eventId);
      }
      else if (path.endsWith('/receipt/store')) {
        if (missingReceipts.has(body.eventId)) throw new Error('模拟回执存储失败');
        receipts.set(body.eventId, body.receipt);
      }
      else if (path.endsWith('/community/finish')) {
        finished.push({ eventId: body.eventId, retry: body.retry, ...(body.deferred ? { deferred: true } : {}) });
        data = { ok: true };
      }
      else throw new Error(`Unexpected request: ${path}`);
      return { data: { data } };
    }
  }));
  const app = createTestApp({ config: {
    'qq-bot': { app_id: '123' },
    'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'fixture' } }
  } });
  t.after(() => app.dispose());
  app.actions.on('message.send.target', () => rejectSend
    ? [createResult(ResultCode.Fail, '发送未被平台接受')]
    : [createResult(ResultCode.Ok, '送达', { id: 'welcome-receipt' })]);
  const batch = (eventId: string, items: string[]): CommunityBatch => ({
    eventId, kind: 'welcome', items,
    target: { platform: 'qq-bot', BotId: 'community-bot', scope: 'group', targetId: 'welcome-group' }
  });
  const run = (value?: CommunityBatch) => {
    if (value) batches.push(value);
    return app.runHandler(dispatchCommunityNotifications, app.events.groupMessage({ platform: 'qq-bot', botId: 'community-bot' }));
  };
  return { app, batch, run, absent, finished, finishRequests, finishConsumers, receipts, writes, missingReceipts, unavailable, claimRequests,
    memberReads, unavailableMembers, peakMemberReads: () => peakMemberReads,
    availabilityBatches,
    enableBatchAvailability: () => { batchAvailability = true; },
    setMalformedBatchAvailability: () => { malformedBatchAvailability = true; },
    disable: () => { enabled = false; }, enableShopRaid: () => { shopRaidEnabled = true; },
    loseNextClaimResponse: () => { loseClaimResponse = true; },
    rejectDelivery: (reject: boolean) => { rejectSend = reject; } };
}

test('领取响应丢失后只读取原租约，再继续投递', async t => {
  const { run, batch, loseNextClaimResponse, claimRequests, finished } = fixture(t);
  const value = batch('welcome-lost-claim', ['member']);

  loseNextClaimResponse();
  const delivered = await run(value);
  assert.deepEqual(delivered.errors, []);
  assert.equal(delivered.messages.length, 1);
  assert.match(claimRequests[0].path, /\/claim$/);
  assert.match(claimRequests[1].path, /\/claim\/recover$/);
  assert.deepEqual(claimRequests[1].body, claimRequests[0].body);
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
});

test('领取和回查连续失败后，下次唤醒继续回查原领取令牌', async t => {
  const { run, batch, loseNextClaimResponse, unavailable, claimRequests, finished, finishConsumers } = fixture(t);
  const value = batch('welcome-lost-claim-recovery-unavailable', ['member']);
  loseNextClaimResponse();
  unavailable.add('/community/claim/recover');
  await assert.rejects(run(value), /community\/claim/);
  assert.equal(claimRequests.length, 2);
  assert.deepEqual(finished, []);

  unavailable.delete('/community/claim/recover');
  const delivered = await run();
  assert.deepEqual(delivered.errors, []);
  assert.equal(delivered.messages.length, 1);
  assert.match(claimRequests[2].path, /\/claim\/recover$/);
  assert.deepEqual(claimRequests[2].body, claimRequests[0].body);
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
  assert.deepEqual(finishConsumers, [claimRequests[0].body.consumer]);
});

test('重开领取模块后，只接管已退出进程的原领取回执', async t => {
  const { app, run, batch, loseNextClaimResponse, unavailable, claimRequests } = fixture(t);
  const value = batch('welcome-reopened-claim', ['member']);
  loseNextClaimResponse();
  unavailable.add('/community/claim/recover');
  await assert.rejects(run(value), /community\/claim/);
  assert.equal(claimRequests.length, 2);
  unavailable.delete('/community/claim/recover');

  const db = new DatabaseSync('data/notification-delivery/receipts.sqlite');
  t.after(() => db.close());
  const scanned = db.prepare("SELECT id, body FROM delivery_receipts WHERE id LIKE 'community-claim:%'").get();
  assert.equal(typeof scanned?.id, 'string');
  assert.equal(typeof scanned?.body, 'string');
  const entry = JSON.parse(scanned!.body as string);
  assert.deepEqual(entry.request, claimRequests[0].body);
  const setOwner = db.prepare('UPDATE delivery_receipts SET body = ? WHERE id = ?');
  const updateOwner = (ownerPID: number) => setOwner.run(JSON.stringify({ ...entry, ownerPID }), scanned!.id as string);
  updateOwner(process.ppid);

  const cacheModule = new URL(artifact ? '../../lib/api/bot/notification-cache.js' : '../../src/api/bot/notification-cache.ts', import.meta.url);
  cacheModule.searchParams.set('fixture', 'reopened');
  const fresh = await import(cacheModule.href) as typeof import('../../src/api/bot/notification-cache');
  const dispatch = () => app.invoke(app.events.groupMessage({ platform: 'qq-bot' }), () => fresh.claimCommunityNotification('123'));
  assert.equal((await dispatch()).value, null);
  assert.equal(claimRequests.length, 2);

  const previous = spawnSync(process.execPath, ['-e', '']);
  assert.equal(previous.status, 0);
  updateOwner(previous.pid);
  const restored = await dispatch();
  assert.deepEqual(restored.value?.batch, value);
  assert.equal(restored.value?.consumer, entry.request.consumer);
  assert.match(claimRequests[2].path, /\/claim\/recover$/);
  assert.deepEqual(claimRequests[2].body, claimRequests[0].body);
  const storedRow = db.prepare('SELECT id FROM delivery_receipts WHERE id = ?');
  assert.ok(storedRow.get(scanned!.id as string), '领取恢复还没有完成原批次');
  assert.ok(restored.value?.clearRecovery);
  restored.value.clearRecovery();
  assert.equal(storedRow.get(scanned!.id as string), undefined);
});

test('领取响应丢失但找不到原租约时保留错误，不再发起领取', async t => {
  const { run, batch, unavailable, claimRequests, finished } = fixture(t);
  unavailable.add('/community/claim');

  await assert.rejects(run(batch('welcome-claim-not-committed', ['member'])), /status=503/);
  assert.equal(claimRequests.length, 2);
  assert.match(claimRequests[0].path, /\/claim$/);
  assert.match(claimRequests[1].path, /\/claim\/recover$/);
  assert.deepEqual(finished, []);
});

test('缓存读失败时延后欢迎任务，恢复后发送同一批次', async t => {
  const { run, batch, unavailable, finished } = fixture(t);
  const value = batch('welcome-cache-outage', ['member']);

  for (const path of ['/receipt/read', '/community/settings/read', '/permission/read']) {
    unavailable.add(path);
    const result = await run(value);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 0);
    assert.deepEqual(finished.at(-1), { eventId: value.eventId, retry: true, deferred: true });
    unavailable.delete(path);
  }
  const delivered = await run(value);
  assert.deepEqual(delivered.errors, []);
  assert.equal(delivered.messages.length, 1);
  assert.deepEqual(finished.at(-1), { eventId: value.eventId, retry: false });
});

test('完成回执失败时保留已送达记录，恢复后只补完成回执', async t => {
  const { run, batch, unavailable, finishRequests, receipts, missingReceipts } = fixture(t);
  const value = batch('welcome-finish-cache-outage', ['member']);

  unavailable.add('/community/finish');
  missingReceipts.add(value.eventId);
  await assert.rejects(run(value), /status=503/);
  assert.deepEqual(finishRequests, [false]);
  assert.equal(receipts.has(value.eventId), false);
  unavailable.delete('/community/finish');
  const recovered = await run(value);
  assert.deepEqual(recovered.errors, []);
  assert.equal(recovered.messages.length, 0);
  assert.deepEqual(finishRequests, [false, false]);
});

test('回查领取成功后，完成确认失败仍保留原令牌供重试', async t => {
  const { run, batch, loseNextClaimResponse, unavailable, claimRequests, finishRequests, finishConsumers, receipts } = fixture(t);
  const value = batch('welcome-recovered-claim-finish-outage', ['member']);
  loseNextClaimResponse();
  unavailable.add('/community/finish');
  await assert.rejects(run(value), /status=503/);
  assert.deepEqual(finishRequests, [false]);
  assert.deepEqual(receipts.get(value.eventId), { route: 'group', reason: 'sent' });

  unavailable.delete('/community/finish');
  const retried = await run();
  assert.deepEqual(retried.errors, []);
  assert.equal(retried.messages.length, 0);
  assert.match(claimRequests[2].path, /\/claim\/recover$/);
  assert.deepEqual(claimRequests[2].body, claimRequests[0].body);
  assert.deepEqual(finishRequests, [false, false]);
  assert.deepEqual(finishConsumers, [claimRequests[0].body.consumer, claimRequests[0].body.consumer]);
});

test('商运招募公示仅投给启用群，重复认领和过期消息都不发送', async t => {
  const { run, batch, enableShopRaid, receipts } = fixture(t);
  const value: CommunityBatch = {
    ...batch('convoy-12', ['12']),
    kind: 'shop-raid',
    convoy: { id: 12, departureAt: new Date(Date.now() + 60_000).toISOString(), nextGuardSeat: 1,
      manifest: [{ currency: 'SPIRIT_STONE', quantity: 1000 }] }
  };
  assert.equal((await run(value)).messages.length, 0);
  enableShopRaid();
  const delivered = await run(value);
  assert.deepEqual(delivered.errors, []);
  assert.equal(delivered.messages.length, 1);
  const view = inspectMessage(delivered.messages[0].nodes);
  assert.match(view.text, /万宝楼商队.*护卫招募中/);
  assert.match(view.text, /灵石 ×1000/);
  assert.deepEqual(view.commands, ['/加入商运护卫 12 1', '/打劫队 创建', '/商运 12']);
  assert.deepEqual(receipts.get(value.eventId), { route: 'group', reason: 'sent' });
  assert.equal((await run(value)).messages.length, 0);
  const expired = { ...value, eventId: 'expired', convoy: { ...value.convoy, departureAt: new Date(0).toISOString() } };
  assert.equal((await run(expired)).messages.length, 0);
});

test('商运 QQ 已送达但回执暂时写不进时，同车重试不再发卡', async t => {
  const { run, batch, enableShopRaid, missingReceipts, finished, receipts } = fixture(t);
  enableShopRaid();
  const value: CommunityBatch = {
    ...batch('convoy-13', ['13']),
    kind: 'shop-raid',
    convoy: { id: 13, departureAt: new Date(Date.now() + 60_000).toISOString(),
      manifest: [{ currency: 'SPIRIT_STONE', quantity: 1000 }] }
  };
  missingReceipts.add(value.eventId);
  assert.equal((await run(value)).messages.length, 1);
  assert.equal(receipts.has(value.eventId), false);
  assert.equal((await run(value)).messages.length, 0);
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }, { eventId: value.eventId, retry: false }]);
});

function quoteOf(message: { nodes: NonNullable<Parameters<typeof inspectMessage>[0]> }) {
  const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
  assert.equal(quotes.length, 1);
  const quote = quotes[0];
  if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected structured quote');
  return quote.value;
}

test('单人欢迎提及真实成员，新老玩家与玩法入口在同一引用块，成功后不重复投递', async t => {
  const { run, batch, finished, receipts } = fixture(t);
  const value = batch('welcome-once', ['new-member']);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(message.target?.targetId, 'welcome-group');
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(message.nodes).text, /仙途来客/);
  const quote = quoteOf(message);
  const view = inspectMessage([{ type: 'Markdown', value: quote }]);
  assert.match(view.text, /愿你在此结识同道，共赴仙途/);
  assert.doesNotMatch(view.text, /欢迎 1 位|新玩家|帮助查看|礼包|UID|登录/);
  assert.deepEqual(quote.filter(node => node.type === 'MD.mention').map(node => node.value), ['new-member']);
  assert.deepEqual(view.commands, ['/踏入仙途', '/我的活动', '/配置群欢迎 关闭']);
  assert.ok(quote.filter(node => node.type === 'MD.button').every(node => !node.options?.autoEnter));
  assert.deepEqual(receipts.get(value.eventId), { route: 'group', reason: 'sent' });
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
  const repeat = await run(value);
  assert.equal(repeat.messages.length, 0);
});

test('多人欢迎只提及仍在群内的成员，人数一致且不修改原批次', async t => {
  const { run, batch, absent } = fixture(t);
  absent.add('left');
  const value = batch('welcome-many', ['first', 'left', 'second', 'first']);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /同道相逢/);
  assert.match(view.text, /迎来 2 位道友/);
  assert.match(view.text, /仙途漫漫，往后便有同道同行/);
  assert.deepEqual(quoteOf(message).filter(node => node.type === 'MD.mention').map(node => node.value), ['first', 'second']);
  assert.deepEqual(value.items, ['first', 'left', 'second', 'first']);
});

test('群欢迎分批核对全部成员并保留原顺序', async t => {
  const { run, batch, absent, memberReads, peakMemberReads, finished } = fixture(t);
  const members = Array.from({ length: 21 }, (_, index) => `member-${index}`);
  absent.add(members[1]);
  absent.add(members[17]);

  const value = batch('welcome-bounded', members);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(memberReads, members);
  assert.equal(peakMemberReads(), 8);
  assert.equal(result.messages.length, 1);
  assert.deepEqual(quoteOf(result.messages[0]).filter(node => node.type === 'MD.mention').map(node => node.value),
    members.filter(id => !absent.has(id)));
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
});

test('支持批读的服务端按分页返回状态，无需逐个成员请求', async t => {
  const { run, batch, absent, memberReads, availabilityBatches, enableBatchAvailability, finished } = fixture(t);
  const members = Array.from({ length: 65 }, (_, index) => `member-${index}`);
  absent.add(members[1]);
  absent.add(members[64]);
  enableBatchAvailability();

  const value = batch('welcome-batch-read', members);
  const result = await run(value);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(availabilityBatches, [members.slice(0, 64), members.slice(64)]);
  assert.deepEqual(memberReads, []);
  assert.equal(result.messages.length, 1);
  assert.deepEqual(quoteOf(result.messages[0]).filter(node => node.type === 'MD.mention').map(node => node.value),
    members.filter(id => !absent.has(id)));
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: false }]);
});

test('批量状态响应缺少成员时延期，不发送部分欢迎', async t => {
  const { run, batch, memberReads, enableBatchAvailability, setMalformedBatchAvailability, finished } = fixture(t);
  enableBatchAvailability();
  setMalformedBatchAvailability();
  const value = batch('welcome-batch-invalid', Array.from({ length: 9 }, (_, index) => `member-${index}`));
  const result = await run(value);

  assert.equal(result.messages.length, 0);
  assert.deepEqual(memberReads, []);
  assert.deepEqual(finished, [{ eventId: value.eventId, retry: true, deferred: true }]);
});

test('成员状态读取失败时延期整批，等待当前请求并停止后续读取', async t => {
  const { run, batch, memberReads, unavailableMembers, finished, receipts } = fixture(t);
  const members = Array.from({ length: 21 }, (_, index) => `member-${index}`);
  unavailableMembers.add(members[2]);
  const value = batch('welcome-batch-unavailable', members);
  const first = await run(value);

  assert.deepEqual(first.errors, []);
  assert.equal(first.messages.length, 0);
  assert.deepEqual(memberReads, members.slice(0, 8));
  assert.deepEqual(finished.at(-1), { eventId: value.eventId, retry: true, deferred: true });
  assert.equal(receipts.has(value.eventId), false);

  unavailableMembers.clear();
  const recovered = await run(value);
  assert.equal(recovered.messages.length, 1);
  assert.deepEqual(memberReads.slice(8), members);
  assert.deepEqual(finished.at(-1), { eventId: value.eventId, retry: false });
});

test('重新投递同一事件保持欢迎文案，多人批次剩一人使用单人排版', async t => {
  const { run, batch, absent, rejectDelivery, app } = fixture(t);
  absent.add('left');
  const value = batch('stable-scene', ['left', 'remaining']);
  rejectDelivery(true);
  const first = await run(value);
  assert.equal(first.messages.length, 1);
  assert.equal(first.actions[first.messages[0].actionIndex].results?.[0].code, ResultCode.Fail);
  assert.match(inspectMessage(first.messages[0].nodes).text, /仙途来客/);
  assert.doesNotMatch(inspectMessage(first.messages[0].nodes).text, /迎来 2 位/);
  rejectDelivery(false);
  await app.clock.advance(60_000);
  const retry = await run(value);
  assert.equal(retry.messages.length, 1);
  assert.equal(retry.actions[retry.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(retry.messages[0].nodes, first.messages[0].nodes);
});

test('欢迎关闭或成员全部离群时结束批次，不发送空欢迎', async t => {
  const { run, batch, absent, disable, finished } = fixture(t);
  absent.add('left');
  assert.equal((await run(batch('all-left', ['left']))).messages.length, 0);
  disable();
  assert.equal((await run(batch('disabled', ['member']))).messages.length, 0);
  assert.deepEqual(finished, [{ eventId: 'all-left', retry: false }, { eventId: 'disabled', retry: false }]);
});

test('欢迎按钮往返：普通成员拒绝，群管理关闭指定群，重复关闭不反转，管理页仅显示开启', async t => {
  const { app, run, batch, writes } = fixture(t);
  const value = batch('welcome-toggle', ['new-member']);
  const welcome = await run(value);
  const command = inspectMessage(welcome.messages[0].nodes).commands.find(command => command === '/配置群欢迎 关闭');
  assert.ok(command);
  for (const role of ['member', 'admin', 'admin'] as const) {
    const result = await app.runHandler(community, {
      ...app.events.groupMessage({ platform: 'qq-bot', botId: 'community-bot', text: command }),
      Role: role, Target: value.target
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    if (role === 'member') {
      assert.equal(writes.length, 0);
      assert.match(view.text, /仅本群管理员或群主可操作/);
    } else {
      assert.match(view.text, /结果：本群成员欢迎已关闭/);
      assert.ok(view.commands.includes('/配置群欢迎 开启'));
      assert.ok(!view.commands.includes('/配置群欢迎 关闭'));
    }
  }
  assert.equal(writes.length, 2);
  for (const write of writes) {
    assert.deepEqual(write.target, value.target);
    assert.equal(write.settings.welcomeEnabled, false);
  }
  const stopped = await run(batch('after-disable', ['another-member']));
  assert.equal(stopped.messages.length, 0);
});
