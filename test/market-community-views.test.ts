import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import Purchase from '../src/response-apps/market/confirmBuy/app';
import MyListings from '../src/response-apps/market/my/app';
import Credibility from '../src/response-apps/market/credibility/app';
import Records from '../src/response-apps/robberyRecord/app';
import { fetchPriceRange } from '../src/response-apps/market/sell/app';
import { glossaryView } from '../src/api/bot/market-community-views';
import { initiateChangeEmail } from '../src/response-apps/emailSecurity/changeEmail/app';
import { initiateChangeAccount } from '../src/response-apps/emailSecurity/changeAccount/app';
const request = { requestId: 'workflow-test', idempotencyKey: 'workflow-key' };
test('market, glossary, security and robbery workflows retain one request per business response', async t => {
  mockBackendConfig(t, { api_url: 'https://views.test', robot_auth_token: 'test-only-token' });
  let response: unknown;
  const calls: Array<{url: string; data?: unknown}> = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: typeof calls[number]) => {
    calls.push(options);
    return { status: 200, headers: {}, data: JSON.stringify({ data: response }) };
  } }));
  const one = async <T>(data: unknown, run: () => Promise<T>) => {
    response = data;
    const before = calls.length;
    const result = await run();
    assert.equal(calls.length - before, 1);
    return result;
  };
  const preview = { listingId: 1, itemName: '玄铁', quantity: 2, totalPrice: 1200,
    currencyName: '灵晶', shouldConfirm: true, overpriceWarning: '' };
  assert.equal((await one({ preview }, () => Purchase({ bid: 'one', uid: 1, listingId: 1,
    quantity: 2, isConfirmed: false }))).code, 'NEED_CONFIRM');
  assert.equal((await one({ receipt: { message: '购买成功' } }, () => Purchase({ bid: 'one', uid: 1, listingId: 1,
    quantity: 2, isConfirmed: true, request }))).code, 'OK');
  const range = { minPrice: 1, maxPrice: 9, referencePrice: 5, source: 'median', credibilityReady: true,
    maxListingQuantity: 10, fixedQuantity: false, templateItemId: 1 };
  const sell = await one({ range, receipt: { message: '上架成功', listingId: 2 } }, () => fetchPriceRange({ bid: 'one', uid: 1,
    userItemId: 1, categoryKey: { type: 'prop' }, firstNumber: 2, secondNumber: 5, request }));
  assert.equal(sell.code, 'OK');
  if (sell.code === 'OK') { assert.equal(sell.submission?.code, 'OK'); }
  assert.equal((await one({ listings: { items: [], pagination: { currentPage: 1, totalPages: 0, total: 0 } } },
    () => MyListings({ bid: 'one', uid: 1, page: 1 }))).code, 'OK');
  const credibility = { baseScore: 100, vipBonus: 0, monthCardBonus: 0, activityScore: 0,
    totalScore: 100, threshold: 60, dailyFreeCancelLimit: 1, maxScore: 200,
    isAboveThreshold: true, progressBar: '原进度', statusText: '原状态' };
  assert.equal((await one({ credibility }, () => Credibility({ bid: 'one', uid: 1 }))).code, 'OK');
  assert.equal((await one({ records: [], currentPage: 1, totalPages: 0, total: 0 },
    () => Records({ bid: 'one', uid: 1, page: 1 }))).code, 'OK');
  const policy = { categories: ['通用'], defaultCategory: '通用', keywordMaxLength: 30, contentMaxLength: 500, categoryValid: true };
  const view = await one({ policy, exact: null, page: { items: [], total: 0, page: 1, pageSize: 5 } },
    () => glossaryView('one', 'browse'));
  assert.equal(view.page?.currentPage, 1);
  assert.equal((await one({ type: 'changeEmail', expiresIn: 300, remainingToday: 2, currentEmail: 'old@example.com' },
    () => initiateChangeEmail({ bid: 'one', messageText: '/更换邮箱 new@example.com', request }))).code, 'OK');
  const account = await one({ type: 'change', expiresIn: 300, remainingToday: 2, currentEmail: 'old@example.com', targetName: '目标' },
    () => initiateChangeAccount({ bid: 'one', messageText: '/更换账号 2', request }));
  assert.equal(account.code, 'OK');
  if (account.code === 'OK') { assert.equal(account.data.currentUserEmail, 'old@example.com'); }
});
