import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { logger } from 'alemonjs';
import App from '../src/response-apps/storyline/list/app';

for (const scenario of [
  {status: 500, code: 'INTERNAL', message: 'Error 1064 near MIN(sha_qi + 1, 999)', expected: '服务暂时不可用，请稍后再试'},
  {status: 403, code: 'FORBIDDEN', message: '当前境界尚未开放该章节', expected: '当前境界尚未开放该章节'}
]) {
  test(`storyline catalog handles ${scenario.code} without exposing SQL`, async t => {
    mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
    t.mock.method(logger, 'error', () => undefined);
    let calls = 0;
    t.mock.method(axios, 'create', () => ({request: async (options: {method: string; url: string}) => {
      calls++;
      assert.equal(options.method, 'GET');
      const url = new URL(options.url);
      assert.equal(url.pathname, '/api/v1/players/1000005/storyline/catalog');
      assert.equal(url.searchParams.get('chapterNumber'), '31');
      return {status: scenario.status, headers: {}, data: JSON.stringify({error: {code: scenario.code, message: scenario.message}})};
    }}));
    const result = await App({uid: 1000005, bid: 'bid', chapterArg: 31, pageArg: 1});
    assert.equal(result.code, 'LOAD_FAILED');
    if (result.code === 'LOAD_FAILED') assert.equal(result.data.message, scenario.expected);
    assert.equal(calls, 1);
  });
}
