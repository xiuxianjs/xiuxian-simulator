import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SDKError } from '../src/api/core/error';
import { getCommandErrorMessage } from '../src/utils/commandError';

test('quantity and eligibility rejections retain player feedback', () => {
  for (const status of [400, 403, 404, 409, 422]) {
    assert.equal(getCommandErrorMessage(new SDKError('物品数量不足', { code: 'CONFLICT', status })), '物品数量不足');
  }
});

test('infrastructure failures never expose SQL, SDK, authentication, or stack details', () => {
  for (const error of [
    new SDKError('Table xiuxian_release.secret does not exist', { code: 'INTERNAL', status: 500 }),
    new SDKError('Invalid JSON response', { code: 'SDK_INVALID_RESPONSE', status: 404 }),
    new SDKError('invalid robot token', { code: 'UNAUTHORIZED', status: 401 }),
    new SDKError('migration required', { code: 'UNAVAILABLE', status: 503 }),
    new SDKError('backend URL', { code: 'INTERNAL', status: 409 }),
    new SDKError('', { code: 'CONFLICT', status: 409 }),
    new TypeError('Cannot destructure endpoint'),
    { message: 'untrusted error object', status: 409 }
  ]) {
    assert.equal(getCommandErrorMessage(error), '服务暂时不可用，请稍后再试');
  }
});

test('known tribulation availability gives clear feedback while arbitrary 503 details stay hidden', () => {
  assert.equal(getCommandErrorMessage(new SDKError('ignored', { code: 'TRIBULATION_EVENTS_DISABLED', status: 503 })), '新渡劫尚未开放，暂时无法查询劫云。');
  assert.equal(getCommandErrorMessage(new SDKError('新渡劫事件与观望尚未开放', { code: 'SERVICE_UNAVAILABLE', status: 503 })), '新渡劫尚未开放，暂时无法查询劫云。');
  for (const error of [
    new SDKError('Table secret missing', { code: 'SERVICE_UNAVAILABLE', status: 503 }),
    new SDKError('新渡劫事件与观望尚未开放', { code: 'INTERNAL', status: 500 }),
    new SDKError('新渡劫事件与观望尚未开放', { code: 'SDK_TIMEOUT', status: 503 })
  ]) assert.equal(getCommandErrorMessage(error), '服务暂时不可用，请稍后再试');
});
