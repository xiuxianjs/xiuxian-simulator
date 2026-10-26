import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '../src/api/core/client';
import { SDKError } from '../src/api/core/error';

const input = { body: { messageText: '/我的资料', platform: 'qq' }, idempotencyKey: 'local-event' };

test('SDK diagnostic stages surround one HTTP call and never enter the request payload', async () => {
  const stages: string[] = [];
  let calls = 0;
  const client = createClient({
    baseUrl: 'https://home.test', identity: { kind: 'robot', token: 'local', bid: 'local' },
    adapter: async config => {
      calls++;
      assert.deepEqual(JSON.parse(config.data), input.body);
      return { status: 200, statusText: 'OK', headers: {}, config, data: JSON.stringify({ data: { observed: true } }) };
    },
    onTiming: (stage, start, end, outcome) => {
      assert.ok(end >= start);
      assert.equal(outcome, 'fulfilled');
      stages.push(stage);
    }
  });
  assert.deepEqual(await client.request('post_v2_robot_home_overview', input), { observed: true });
  assert.equal(calls, 1);
  assert.deepEqual(stages, ['api.sdk.prepare', 'api.http.wait', 'api.sdk.response', 'api.json.parse', 'api.sdk.envelope']);
});

test('failed HTTP and throwing timing callbacks preserve SDK errors and never retry', async () => {
  let calls = 0;
  const stages: Array<[string, string]> = [];
  const client = createClient({
    baseUrl: 'https://home.test', identity: { kind: 'robot', token: 'local', bid: 'local' },
    adapter: async config => {
      calls++;
      return { status: 503, statusText: 'Unavailable', headers: {}, config, data: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'unavailable' } }) };
    },
    onTiming: (stage, _start, _end, outcome) => {
      stages.push([stage, outcome]);
      throw new Error('logger failed');
    }
  });
  await assert.rejects(client.request('post_v2_robot_home_overview', input), error => error instanceof SDKError && error.status === 503 && error.code === 'UNAVAILABLE');
  assert.equal(calls, 1);
  assert.deepEqual(stages.at(-1), ['api.sdk.envelope', 'rejected']);
});

test('network and malformed JSON errors close the failing stage without extra HTTP calls', async () => {
  for (const mode of ['network', 'json'] as const) {
    let calls = 0;
    const stages: Array<[string, string]> = [];
    const client = createClient({
      baseUrl: 'https://home.test', identity: { kind: 'robot', token: 'local', bid: 'local' },
      adapter: async config => {
        calls++;
        if (mode === 'network') throw new Error('disconnected');
        return { status: 200, statusText: 'OK', headers: {}, config, data: '{broken' };
      },
      onTiming: (stage, _start, _end, outcome) => { stages.push([stage, outcome]); }
    });
    await assert.rejects(client.request('post_v2_robot_home_overview', input), error => error instanceof SDKError && error.code === (mode === 'network' ? 'SDK_NETWORK_ERROR' : 'SDK_INVALID_RESPONSE'));
    assert.equal(calls, 1);
    assert.deepEqual(stages.at(-1), [mode === 'network' ? 'api.http.wait' : 'api.json.parse', 'rejected']);
  }
});
