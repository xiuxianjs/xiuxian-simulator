import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { repeatPresentationHeaders } from '../src/api/bot/repeat-presentation';
import Checkin from '../src/response-apps/guild/checkin/app';
import Claim from '../src/response-apps/guild/claimMilestone/app';
import Impeach from '../src/response-apps/guild/impeachLeader/app';
import Kick from '../src/response-apps/guild/kickMember/app';
import Leave from '../src/response-apps/guild/leaderLeave/app';
import Mining from '../src/response-apps/guild/mining/app';
import Level from '../src/response-apps/guild/upgradeLevel/app';
import Shop from '../src/response-apps/guild/upgradeShop/app';
import Vein from '../src/response-apps/guild/upgradeVein/app';

test('nine direct message apps send the exact repeat command in their business request', async t => {
  mockBackendConfig(t, { api_url: 'https://guild.test', robot_auth_token: 'test-only-token' });
  const calls: { headers: Record<string, string> }[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    // An incomplete response must remain a local failure, without another mutation.
    return { status: 200, headers: {}, data: JSON.stringify({ data: {} }) };
  } }));
  const command = '  /宗门指令 @目标\n';
  const params = { bid: 'one', uid: 1, repeatCommand: command,
    request: { requestId: 'repeat-test', idempotencyKey: 'repeat-test-key' } };
  const runs = [() => Checkin(params), () => Claim({ ...params, milestoneId: 2 }),
    () => Impeach(params), () => Kick({ ...params, targetUid: 2 }), () => Leave(params),
    () => Mining(params), () => Level(params), () => Shop(params), () => Vein(params)];
  for (const run of runs) {
    const before = calls.length;
    await run();
    assert.equal(calls.length - before, 1);
    assert.equal(Buffer.from(new Headers(calls.at(-1)!.headers).get('X-Repeat-Command')!, 'base64').toString('utf8'), command);
  }
  assert.deepEqual(repeatPresentationHeaders('中'.repeat(1366)), {});
  assert.ok(repeatPresentationHeaders('中'.repeat(1365))['X-Repeat-Command']);
});
