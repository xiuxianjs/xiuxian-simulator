import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendReferralOverview } from '../src/api/bot/referral-overview';
import { getReferralInvitees } from '../src/api/bot/referral-invitees';
import { bindBackendReferralCode, claimBackendReferralRewards } from '../src/api/bot/referral-actions';

test('actual Go referral sync, binding and claim receipts survive SDK parsing', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotReferralAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('REFERRAL_ADAPTER_FIXTURES='))?.split('REFERRAL_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'actual Go referral receipts missing');
  const fixtures = JSON.parse(encoded) as Record<string, Record<string, unknown>>;
  let payload: unknown;
  let lastURL = '';
  let lastBody: unknown;
  let calls = 0;
  const request = { requestId: 'referral-contract-request', idempotencyKey: 'referral-contract-key' };
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    lastBody = body ? JSON.parse(body) : undefined;
    lastURL = req.url ?? '';
    if (lastURL.includes('/referral/invitees')) {
      assert.equal(req.method, 'GET');
      assert.equal(req.headers['idempotency-key'], undefined);
    } else {
      assert.equal(req.method, 'POST');
      assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    }
    calls++;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const expectedRewards = (fixture: Record<string, unknown>) => (fixture.issued as { name: string; amount: number }[]).map(({ name, amount }) => ({ name, amount }));
  try {
    for (const [key, fixture] of Object.entries(fixtures).filter(([key]) => key.startsWith('overview'))) {
      payload = fixture;
      const parsed = await getBackendReferralOverview('player', 7, request);
      const { rules: _rules, ...expected } = fixture;
      assert.deepEqual(parsed, expected, key);
      assert.equal(lastURL, '/api/v1/players/7/referral/overview/sync');
      assert.equal(lastBody, undefined);
    }
    for (const key of ['bindCurrency', 'bindEmpty', 'bindItems']) {
      payload = fixtures[key];
      const code = key === 'bindItems' ? 'tt-4' : ' tt-2 ';
      assert.deepEqual(await bindBackendReferralCode('player', 1, code, request), expectedRewards(fixtures[key]));
      assert.deepEqual(lastBody, { code }); // Preserve server-side trimming and validation.
      assert.equal(lastURL, '/api/v1/players/1/referral/bind');
    }
    for (const key of ['claimCurrency', 'claimItems']) {
      payload = fixtures[key];
      const uid = key === 'claimCurrency' ? 7 : 1;
      assert.deepEqual(await claimBackendReferralRewards('player', uid, request), { claimed: fixtures[key].claimed, issued: expectedRewards(fixtures[key]) });
      assert.equal(lastURL, `/api/v1/players/${uid}/referral/claim`);
    }
    const base = fixtures.overviewPending;
    for (const key of ['inviteesBefore', 'inviteesClaimed']) {
      payload = fixtures[key];
      assert.deepEqual(await getReferralInvitees('player', 7, 1), fixtures[key]);
      assert.equal(lastURL, '/api/v1/players/7/referral/invitees?page=1&pageSize=5');
    }
    payload = { ...base, inviteLimit: 30 };
    assert.equal((await getBackendReferralOverview('player', 7, request)).inviteLimit, 30, 'older finite-limit servers remain readable');
    const malformed = [undefined, null, '1', -1, 1.25, Number.MAX_SAFE_INTEGER + 1];
    for (const field of ['inviteCount', 'inviteLimit', 'pendingRewards']) {
      for (const value of malformed.filter(value => field !== 'inviteLimit' || value !== null)) {
        payload = { ...base, [field]: value };
        await assert.rejects(getBackendReferralOverview('player', 7, request), /不完整/);
      }
    }
    for (const kind of ['count', 'vip_level', 'realm_level']) {
      const panels = base.rulePanels as Record<string, Record<string, unknown>>;
      for (const value of malformed) {
        payload = { ...base, rulePanels: { ...panels, [kind]: { ...panels[kind], pendingCount: value } } };
        await assert.rejects(getBackendReferralOverview('player', 7, request), /不完整/);
      }
    }
    for (const value of [null, [], {}, { ...base, code: null }, { ...base, rulePanels: null }]) {
      payload = value;
      await assert.rejects(getBackendReferralOverview('player', 7, request), /不完整/);
    }
    const panels = base.rulePanels as Record<string, Record<string, unknown>>;
    for (const group of [null, [], {}, { threshold: '', icon: '', tag: '', rewards: null }, { threshold: '', icon: '', tag: '', rewards: [1] }]) {
      payload = { ...base, rulePanels: { ...panels, count: { ...panels.count, groups: [group] } } };
      await assert.rejects(getBackendReferralOverview('player', 7, request), /不完整/);
    }
    for (const value of malformed.concat(0)) {
      payload = { ...fixtures.claimCurrency, claimed: value };
      await assert.rejects(claimBackendReferralRewards('player', 7, request), /不完整/);
    }
    for (const issued of [null, {}, [null], [{ name: '奖励', type: 'item', amount: 0 }], [{ name: '奖励', type: 'item', amount: Number.MAX_SAFE_INTEGER + 1 }]]) {
      payload = { issued, claimed: 1 };
      await assert.rejects(claimBackendReferralRewards('player', 7, request), /不完整/);
      await assert.rejects(bindBackendReferralCode('player', 1, 'tt-2', request), /不完整/);
    }
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(getBackendReferralOverview('player', uid, request));
      await assert.rejects(claimBackendReferralRewards('player', uid, request));
      await assert.rejects(bindBackendReferralCode('player', uid, 'tt-2', request));
    }
    await assert.rejects(getBackendReferralOverview('player', 7), /唯一标识/);
    await assert.rejects(claimBackendReferralRewards('player', 7), /唯一标识/);
    await assert.rejects(bindBackendReferralCode('player', 1, 'tt-2'), /唯一标识/);
    assert.equal(calls, before, 'invalid identity and missing replay keys do not submit writes');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
