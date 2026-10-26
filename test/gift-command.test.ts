import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { commandBackendCompanionGift } from '../src/api/bot/companion-gift-command';
const mutation = { success: true, message: '原结果', giftName: '花', targetName: '乙', reply: '原回复', intimacyGained: 12, tongxinGained: 5, premium: false };
const options = { targetFound: true, targetId: 2, targetName: '乙', gifts: [], dailyPremiumGiftUsed: 0, dailyPremiumGiftLimit: 2, weeklyIntimacyUsed: 0, weeklyIntimacyLimit: 300 };
for (const mode of ['OPTIONS','TARGETS','GIFT','INVALID'] as const) {
 test(`gift ${mode} combines real target resolution and domain facts in one HTTP`, async t => {
  mockBackendConfig(t, { api_url: 'https://gift.test', robot_auth_token: 'token' });
  const calls: Record<string,unknown>[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: Record<string,unknown>) => {
   calls.push(config);
   return { status: 200, headers: {}, data: JSON.stringify({ data: { mode, targetId: mode==='INVALID'?0:2, giftName: mode==='GIFT'?'花':'', options: mode==='OPTIONS'?options:null, targets: mode==='TARGETS'?{ giftExists:null, friends:[] }:null, mutation: mode==='GIFT'?mutation:null } }) };
  }}));
  const out = await commandBackendCompanionGift('one',1,{ firstParam:'@乙', secondParam:mode==='GIFT'?'花':undefined, targetBid:'two' }, mode==='GIFT'?{ requestId:'trace', idempotencyKey:'msg' }:undefined);
  assert.equal(out.mode,mode);
  assert.equal(calls.length,1);
  assert.match(String(calls[0].url),/companion\/gifts\/command$/);
  assert.match(String(calls[0].data),/two/);
  if(mode==='GIFT') { assert.deepEqual(out.mutation,mutation); }
 });
}
