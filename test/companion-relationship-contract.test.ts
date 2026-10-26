import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendCompanionInfo, parseCompanionInfo } from '../src/api/bot/companion-info-queries';
import { getBackendCompanionOathUpgradePreview } from '../src/api/bot/companion-oath-preview';
import { breakupBackendCompanion, dualCultivateBackendCompanion, upgradeBackendCompanionOath } from '../src/api/bot/companion-relationship-actions';

test('companion reads and relationship mutations consume real Go service receipts', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotCompanionRelationshipAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('COMPANION_RELATIONSHIP_ADAPTER_FIXTURES='))?.split('COMPANION_RELATIONSHIP_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'actual companion service fixtures missing');
  const fixtures = JSON.parse(encoded) as Record<string, Record<string, unknown>>;
  let payload: unknown;
  let lastURL = '';
  let lastMethod = '';
  let calls = 0;
  const request = { requestId: 'companion-contract-request', idempotencyKey: 'companion-contract-key' };
  const server = createServer((req, res) => {
    lastURL = req.url ?? '';
    lastMethod = req.method ?? '';
    if (lastMethod !== 'GET') assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    calls++;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const info = (uid = 1) => getBackendCompanionInfo('player', uid);
  const preview = (uid = 1) => getBackendCompanionOathUpgradePreview('player', uid);
  const dual = (uid = 1) => dualCultivateBackendCompanion('player', uid, request);
  const upgrade = (uid = 1) => upgradeBackendCompanionOath('player', uid, request);
  const breakup = (uid = 1) => breakupBackendCompanion('player', uid, request);
  try {
    for (const [key, fixture] of Object.entries(fixtures)) {
      payload = fixture;
      if (key.startsWith('info')) {
        const uid = key === 'infoSignedEmpty' ? 1 : Number(key.slice(4));
        assert.deepEqual(await info(uid), fixture, key);
        assert.equal(lastMethod, 'GET');
        assert.equal(lastURL, `/api/v1/players/${uid}/companion`);
      } else if (key === 'preview') {
        assert.deepEqual(await preview(), fixture);
        assert.equal(lastMethod, 'GET');
        assert.equal(lastURL, '/api/v1/players/1/companion/oath-upgrade');
      } else if (key === 'upgrade') {
        assert.deepEqual(await upgrade(), fixture);
        assert.equal(lastMethod, 'POST');
      } else if (key === 'breakup') {
        assert.deepEqual(await breakup(), fixture);
        assert.equal(lastMethod, 'DELETE');
      } else {
        assert.deepEqual(await dual(), fixture, key);
        assert.equal(lastMethod, 'POST');
      }
    }
    const base = fixtures.info1;
    const partner = base.companion as Record<string, unknown>;
    const invalidInteger = [undefined, null, '1', 1.25, Infinity, Number.MAX_SAFE_INTEGER + 1];
    for (const field of ['partnerId', 'intimacy', 'tongxin', 'blessingPercent', 'dualCultivationExp', 'dailyDualCultivationUsed', 'dailyDungeonUsed', 'dailyGiftUsed']) {
      for (const value of invalidInteger) {
        payload = { ...base, companion: { ...partner, [field]: value } };
        await assert.rejects(info(), /不完整/);
      }
    }
    // Signed historical intimacy is part of the actual Go read contract.
    assert.equal((fixtures.infoSignedEmpty.companion as Record<string, unknown>).intimacy, -1);
    for (const field of ['partnerName', 'partnerRealm', 'companionSince', 'anniversaryMessage']) {
      for (const value of [undefined, 1, []]) {
        assert.throws(() => parseCompanionInfo({ ...base, companion: { ...partner, [field]: value } }), /不完整/);
      }
    }
    for (const field of ['displayPartnerName', 'displayPartnerRealm', 'spiritBondLevel', 'companionMessage']) {
      assert.throws(() => parseCompanionInfo({ ...base, companion: { ...partner, [field]: null } }), /不完整/);
    }
    for (const value of [null, [], {}, { ...base, access: [] }, { ...base, noCompanionMessage: undefined }, { ...base, companion: [] }, { ...base, companion: { ...partner, oathType: 'legacy-invalid' } }]) {
      payload = value;
      await assert.rejects(info(), /不完整/);
    }
    for (const field of ['partnerId', 'currentBlessingPercent', 'upgradedBlessingPercent']) {
      for (const value of invalidInteger) {
        payload = { ...fixtures.preview, [field]: value };
        await assert.rejects(preview(), /不完整/);
      }
    }
    for (const field of ['partnerId', 'experienceGained', 'tongxinGained']) {
      for (const value of invalidInteger) {
        payload = { ...fixtures.dual200, [field]: value };
        await assert.rejects(dual(), /不完整/);
      }
    }
    for (const value of [undefined, null, '', '   ', 1]) {
      payload = { ...fixtures.breakup, narrativeText: value };
      await assert.rejects(breakup(), /叙事/);
    }
    for (const value of [null, [], {}, { success: true, message: null }]) {
      payload = value;
      await assert.rejects(upgrade(), /不完整/);
    }
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      for (const run of [info, preview, dual, upgrade, breakup]) await assert.rejects(run(uid));
    }
    await assert.rejects(dualCultivateBackendCompanion('player', 1), /唯一标识/);
    await assert.rejects(upgradeBackendCompanionOath('player', 1), /唯一标识/);
    await assert.rejects(breakupBackendCompanion('player', 1), /唯一标识/);
    assert.equal(calls, before, 'invalid IDs and missing replay keys do not submit mutations');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
