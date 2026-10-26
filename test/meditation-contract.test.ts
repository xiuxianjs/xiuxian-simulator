import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { guardBackendMeditationCommand, startBackendMeditation, settleBackendMeditation } from '../src/api/bot/meditation';

test('meditation adapters validate actual Go success, business failure, settlement and guard receipts', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotMeditationAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('MEDITATION_ADAPTER_FIXTURES='))?.split('MEDITATION_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'actual Go meditation receipts missing');
  const fixtures = JSON.parse(encoded) as Record<string, Record<string, unknown>>;
  let payload: unknown;
  let lastURL = '';
  let lastBody: unknown;
  let calls = 0;
  const request = { requestId: 'meditation-contract-request', idempotencyKey: 'meditation-contract-key' };
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    lastBody = body ? JSON.parse(body) : undefined;
    lastURL = req.url ?? '';
    assert.equal(req.method, 'POST');
    if (!lastURL.endsWith('/guard')) assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    calls++;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    for (const [key, fixture] of Object.entries(fixtures)) {
      payload = fixture;
      if (key.startsWith('guard')) {
        assert.deepEqual(await guardBackendMeditationCommand('player', 1, '/查看秘境'), fixture, key);
        assert.equal(lastURL, '/api/v1/players/1/meditation/guard');
        assert.deepEqual(lastBody, { command: '/查看秘境' });
      } else {
        const { reason: _reason, ...expected } = fixture;
        if (key.startsWith('start')) {
          assert.deepEqual(await startBackendMeditation('player', 1, request), expected, key);
          assert.equal(lastURL, '/api/v1/players/1/meditation/start');
        } else {
          assert.deepEqual(await settleBackendMeditation('player', 1, request), expected, key);
          assert.equal(lastURL, '/api/v1/players/1/meditation/settle');
        }
        assert.equal(lastBody, undefined);
      }
    }
    const start = fixtures.startstart;
    const end = fixtures.settlenormal;
    const invalidInteger = [undefined, null, '1', 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity];
    for (const field of ['maxDurationMinutes', 'elapsedMinutes', 'qiSoFar', 'expSoFar', 'dailyRemaining', 'maxDurationHours']) {
      for (const value of invalidInteger) {
        payload = { ...start, [field]: value };
        await assert.rejects(startBackendMeditation('player', 1, request), /不完整/);
      }
    }
    for (const field of ['maxDurationMinutes', 'elapsedMinutes', 'qiGained', 'expGained', 'recoveredMental', 'totalQi', 'dailyQiGained', 'dailyQiCap', 'minimumRewardMinutes']) {
      for (const value of invalidInteger) {
        payload = { ...end, [field]: value };
        await assert.rejects(settleBackendMeditation('player', 1, request), /不完整/);
      }
    }
    const config = start.config as Record<string, unknown>;
    for (const field of Object.keys(config)) {
      for (const value of [undefined, null, '1']) {
        payload = { ...start, config: { ...config, [field]: value } };
        await assert.rejects(startBackendMeditation('player', 1, request), /不完整/);
      }
    }
    const preview = start.passPreview as Record<string, unknown>;
    for (const field of Object.keys(preview)) {
      payload = { ...start, passPreview: { ...preview, [field]: null } };
      await assert.rejects(startBackendMeditation('player', 1, request), /不完整/);
    }
    // Unsuccessful DTOs still serialize all fixed fields; missing data cannot become a valid typed result.
    for (const field of ['alreadyMeditating', 'elapsedText', 'qiSoFar', 'hasSeclusionPassBonus']) {
      payload = { ...fixtures.startteam, [field]: undefined };
      await assert.rejects(startBackendMeditation('player', 1, request), /不完整/);
    }
    for (const field of ['elapsedMinutes', 'totalQi', 'rewardNotice', 'hasSeclusionPassBonus']) {
      payload = { ...fixtures.settleinactive, [field]: undefined };
      await assert.rejects(settleBackendMeditation('player', 1, request), /不完整/);
    }
    for (const value of [null, [], {}, { ...start, button: null }, { ...start, buttonText: 1 }, { ...start, config: [] }, { ...start, passPreview: [] }]) {
      payload = value;
      await assert.rejects(startBackendMeditation('player', 1, request), /不完整/);
    }
    for (const value of [null, [], {}, { active: 1, allowed: true }, { active: false, allowed: null }]) {
      payload = value;
      await assert.rejects(guardBackendMeditationCommand('player', 1, '/查看秘境'), /不完整/);
    }
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(startBackendMeditation('player', uid, request));
      await assert.rejects(settleBackendMeditation('player', uid, request));
      await assert.rejects(guardBackendMeditationCommand('player', uid, '/查看秘境'));
    }
    await assert.rejects(startBackendMeditation('player', 1), /唯一标识/);
    await assert.rejects(settleBackendMeditation('player', 1), /唯一标识/);
    assert.equal(calls, before, 'invalid player IDs and missing replay keys cannot submit writes');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
