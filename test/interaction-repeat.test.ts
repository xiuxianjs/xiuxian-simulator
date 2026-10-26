import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import type { GameEvent } from '../src/types/event';
import { mockBackendConfig } from './backend-config-helper';
import { withBackendRepeatDetection } from '../src/utils/backendRepeatDetector';
import { createBackendRequestContext } from '../src/api/bot/context';
import { attemptBackendEmailDelete } from '../src/api/bot/email-delete';
import { deleteAllBackendEmails } from '../src/api/bot/email-delete-all';
import { claimAllBackendEmails } from '../src/api/bot/email-claim-all';
import { claimBackendEmail } from '../src/api/bot/email-claim';
import { glossaryEditContextCommand } from '../src/api/bot/market-community-views';
import { BackendAPIError } from '../src/api/bot/client';

const event = (message = '/删除邮件 7'): GameEvent => ({ name: 'message.create', value: {}, GuildId: 'group', SpaceId: 'group', ChannelId: 'channel', UserKey: 'qq-bot:one', IsMaster: false, IsBot: false, OpenId: 'openid', UserId: 'one', uid: 1, MessageId: 'message', Platform: 'qq-bot', MessageText: message, Target: { scope: 'group', targetId: 'group' } });
const samples = [
  { command: '删除邮件', message: '无法删除该邮件（可能已删除或邮件不存在）', data: { emailId: 7, deleted: false, confirmationRequired: false }, call: (request: ReturnType<typeof createBackendRequestContext>) => attemptBackendEmailDelete('one', 1, 7, request) },
  { command: '一键删除邮件', message: '暂无可删除的邮件', data: { deleted: 0, total: 0 }, call: (request: ReturnType<typeof createBackendRequestContext>) => deleteAllBackendEmails('one', 1, request) },
  { command: '一键领取邮件', message: '所有邮件附件已领取过，无需重复领取', data: { claimed: 0, skipped: 2, total: 2 }, call: (request: ReturnType<typeof createBackendRequestContext>) => claimAllBackendEmails('one', 1, request) },
  { command: '录入词典', message: '⛔ 你没有词典编辑权限', data: { exact: null, policy: null, quota: { allowed: false, withinLimit: false, used: null, dailyLimit: null } }, call: (request: ReturnType<typeof createBackendRequestContext>) => glossaryEditContextCommand('one', 1, request) }
];
for (const sample of samples) {
 test(`${sample.command} consumes matching final presentation without a second HTTP`, async t => {
  mockBackendConfig(t, { api_url: 'https://repeat.test', robot_auth_token: 'token' });
  const calls: Array<{ url: string; method: string; headers: Record<string,string> }> = [];
  t.mock.method(axios, 'create', () => ({ request: async (config: typeof calls[number]) => {
   calls.push(config);
   assert.equal(Buffer.from(config.headers['X-Repeat-Command'] ?? config.headers['x-repeat-command'], 'base64').toString(), sample.command);
   return { status: 200, headers: {}, data: JSON.stringify({ data: sample.data, presentation: { repeat: { uid: 1, command: sample.command, message: sample.message, available: true, count: 3, suffix: '原重复提示' } } }) };
  } }));
  const e=event();
  await withEventContext(e, () => {}, async () => {
   await sample.call(createBackendRequestContext(e));
   assert.equal(await withBackendRepeatDetection('one', 1, sample.command, sample.message, createBackendRequestContext(e)), `${sample.message}\n\n原重复提示`);
   assert.equal(calls.length,1);
   if(sample.command==='录入词典') { assert.equal(String(calls[0].method).toUpperCase(),'POST'); assert.match(calls[0].url,/glossary\/edit-context$/); }
  });
 });
}
test('mail HTTP business failure preserves status and consumes exact fixed catch message in one HTTP', async t => {
 mockBackendConfig(t, { api_url: 'https://repeat.test', robot_auth_token: 'token' });
 let calls=0;
 t.mock.method(axios,'create',()=>({request:async()=>{calls++;return {status:409,headers:{},data:JSON.stringify({error:{code:'ALREADY_CLAIMED',message:'已领取'},presentation:{repeat:{uid:1,command:'领取邮件',message:'领取失败，邮件不存在或已领取',available:true,count:1,suffix:''}}})};}}));
 const e=event('/领取邮件 7');
 await withEventContext(e,()=>{},async()=>{
  await assert.rejects(claimBackendEmail('one',1,7,createBackendRequestContext(e)),(error:unknown)=>error instanceof BackendAPIError&&error.status===409&&error.code==='ALREADY_CLAIMED');
  assert.equal(await withBackendRepeatDetection('one',1,'领取邮件','领取失败，邮件不存在或已领取',createBackendRequestContext(e)),'领取失败，邮件不存在或已领取');
  assert.equal(calls,1);
 });
});
test('missing message identifier never submits mail writes or advances repeat counter',async t=>{
 mockBackendConfig(t,{api_url:'https://repeat.test',robot_auth_token:'token'});
 let calls=0;t.mock.method(axios,'create',()=>({request:async()=>{calls++;throw new Error('must not send');}}));
 const e=event();e.MessageId='';
 await withEventContext(e,()=>{},async()=>{
  await assert.rejects(deleteAllBackendEmails('one',1,createBackendRequestContext(e)),/缺少唯一标识/);
  assert.equal(await withBackendRepeatDetection('one',1,'一键删除邮件','操作失败，请稍后再试',createBackendRequestContext(e)),'操作失败，请稍后再试');
  assert.equal(calls,0);
 });
});
