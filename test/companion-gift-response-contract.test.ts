import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { commandBackendCompanionGift } from '../src/api/bot/companion-gift-command';
import { giveBackendCompanionGift, parseCompanionGiftSettlement } from '../src/api/bot/companion-gift';
import { parseCompanionGiftOptions, parseCompanionGiftTargets } from '../src/api/bot/companion-gift-preparation-queries';
import { mockBackendConfig } from './backend-config-helper';

test('actual companion gift query and settlement JSON passes robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestCompanionGiftResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/COMPANION_GIFT_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go companion gift responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Record<string, unknown>>;
  let payload: unknown;
  const server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-gift-contract' });
  try {
    for (const key of ['targets', 'namedTargets', 'missingGift', 'options', 'missingTarget', 'after']) {
      payload = fixtures[key];
      const result = await commandBackendCompanionGift('bid', 1, {});
      assert.deepEqual(JSON.parse(JSON.stringify(result)), fixtures[key], key);
    }
    for (const key of ['normal', 'premium']) {
      payload = fixtures[key];
      assert.deepEqual(await giveBackendCompanionGift('bid', 1, 2, '花', { idempotencyKey: 'gift-contract', requestId: 'gift-contract' }), fixtures[key], key);
    }
    const options = fixtures.options.options as Record<string, unknown>;
    const gift = (options.gifts as Record<string, unknown>[])[0];
    const invalidIntegers = [undefined, null, '1', 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];
    for (const field of ['dailyPremiumGiftUsed', 'dailyPremiumGiftLimit', 'weeklyIntimacyUsed', 'weeklyIntimacyLimit']) {
      for (const invalid of invalidIntegers) assert.throws(() => parseCompanionGiftOptions({ ...options, [field]: invalid }), /赠礼选项数据不完整/);
    }
    for (const field of ['quantity', 'intimacy']) {
      for (const invalid of invalidIntegers) assert.throws(() => parseCompanionGiftOptions({ ...options, gifts: [{ ...gift, [field]: invalid }] }), /赠礼选项数据不完整/);
    }
    for (const field of ['intimacyGained', 'tongxinGained']) {
      for (const invalid of invalidIntegers) assert.throws(() => parseCompanionGiftSettlement({ ...fixtures.normal, [field]: invalid }), /赠礼结算响应不完整/);
    }
    // Signed historic integer values remain valid; this parser does not add numerical business rules.
    assert.equal(parseCompanionGiftOptions({ ...options, weeklyIntimacyUsed: -1 }).weeklyIntimacyUsed, -1);
    assert.equal(parseCompanionGiftSettlement({ ...fixtures.normal, intimacyGained: -1 }).intimacyGained, -1);
    const targets = fixtures.targets.targets as Record<string, unknown>;
    assert.deepEqual(parseCompanionGiftTargets({ ...targets, extra: 'discard' }), targets);
    assert.deepEqual(parseCompanionGiftOptions({ ...options, extra: 'discard', gifts: [{ ...gift, extra: 'discard' }] }).gifts, [gift]);
    assert.deepEqual(parseCompanionGiftSettlement({ ...fixtures.normal, extra: 'discard' }), fixtures.normal);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
