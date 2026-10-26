import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { after, test } from 'node:test';
import axios from 'axios';
import { onResponse, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { register } from '../../node_modules/@alemonjs/qq-bot/lib/register.js';
import { sendChatNotice } from '../../src/notification/chat';
import type { ChatClaim, ChatReceipt } from '../../src/api/bot/chat';

after(() => shutdownLogger());
const claim: ChatClaim = { noticeId: 'notice', contactId: 1, botId: 'bot', openId: 'private-openid', token: 'claim-token', content: '# 版本更新\n\n**欢迎道友回来。**', mode: 'wakeup' };

for (const { scope, mode } of [{scope:'c2c',mode:'wakeup'}, {scope:'c2c',mode:'proactive'}, {scope:'group',mode:'proactive'}] as const) {
  test(`消息管理 ${scope}/${mode} 经真实框架与 QQ 适配器发送单个原生 Markdown 气泡`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test' } } } });
    t.after(() => app.dispose());
    t.mock.method(axios, 'create', () => ({ async post(path: string) {
      return { data: { data: path.endsWith('/availability/read') ? null : { state: null, raw: '' } } };
    } }));
    const sends: Array<{ scope: string; id: string; body: Record<string, unknown> }> = [];
    const client = Object.assign(new EventEmitter(), { async usersOpenMessages(id: string, body: Record<string, unknown>) { sends.push({ scope: 'c2c', id, body }); return { id: 'qq-receipt' }; }, async groupOpenMessages(id: string, body: Record<string, unknown>) { sends.push({ scope: 'group', id, body }); return { id: 'qq-receipt' }; } });
    const registration = app.run(() => register(client as unknown as Parameters<typeof register>[0], { botId: 'bot', bindActions: false, cbp: { send() {} } as unknown as NonNullable<Parameters<typeof register>[1]>['cbp'] }));
    app.actions.on('message.send', request => new Promise((resolve, reject) => { registration.onAction(request, resolve).catch(reject); }));
    let receipt: ChatReceipt | undefined;
    const result = await app.runHandler(onResponse('message.create', async () => { receipt = await sendChatNotice({ ...claim, scope, mode }); }), app.events.groupMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].results?.[0].data.id, 'qq-receipt');
    assert.equal(sends.length, 1);
    assert.equal(sends[0].id, claim.openId);
    assert.equal(sends[0].scope, scope);
    assert.equal(sends[0].body.content, undefined);
    assert.deepEqual(sends[0].body.markdown, { content: claim.content, custom_template_id: undefined, template_id: undefined, params: undefined, force_verify_image_resource: undefined });
    assert.equal(sends[0].body.msg_type, 2);
    assert.equal(sends[0].body.is_wakeup, mode === 'wakeup' ? true : undefined);
    assert.equal(sends[0].body.msg_id, undefined);
    assert.equal(sends[0].body.event_id, undefined);
    assert.equal(receipt?.status, 'sent');
    assert.equal(receipt?.messageId, 'qq-receipt');
  });
}

for (const outcome of ['rejected', 'no-friend', 'refused', 'timeout', 'missing', 'blocked', 'disabled']) {
  test(`消息管理保存 ${outcome} 的真实结果且不重发`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': { close_proactive_message: outcome === 'disabled', backend: { api_url: 'http://offline.invalid', worker_token: 'test' } } } });
    t.after(() => app.dispose());
    t.mock.method(axios, 'create', () => ({ async post(path: string) { return { data: { data: path.endsWith('/availability/read') ? null : { state: outcome === 'blocked' ? { state: 'blocked' } : null } } }; } }));
    let sends = 0;
    const client = Object.assign(new EventEmitter(), { async usersOpenMessages() {
      sends++;
      if (outcome === 'no-friend' || outcome === 'refused') throw { response: { data: { code: outcome === 'no-friend' ? 40054004 : 40054013, message: 'relationship unavailable' } } };
      if (outcome === 'rejected') throw { response: { data: { code: 40034122, message: '召回消息已达区间上限' } } };
      if (outcome === 'timeout') throw new Error('socket timeout');
      return {};
    } });
    const registration = app.run(() => register(client as unknown as Parameters<typeof register>[0], { botId: 'bot', bindActions: false, cbp: { send() {} } as unknown as NonNullable<Parameters<typeof register>[1]>['cbp'] }));
    app.actions.on('message.send', request => new Promise((resolve, reject) => { registration.onAction(request, resolve).catch(reject); }));
    let receipt: ChatReceipt | undefined;
    const result = await app.runHandler(onResponse('message.create', async () => { receipt = await sendChatNotice(claim); }), app.events.groupMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(sends, outcome === 'blocked' || outcome === 'disabled' ? 0 : 1);
    assert.equal(receipt?.status, ['rejected', 'no-friend', 'refused'].includes(outcome) ? 'failed' : outcome === 'blocked' || outcome === 'disabled' ? 'skipped' : 'unknown');
    if (outcome === 'rejected') { assert.match(receipt!.error, /40034122/); assert.equal(receipt?.platformCode, 40034122); }
    if (outcome === 'no-friend') assert.equal(receipt?.platformCode, 40054004);
    if (outcome === 'refused') assert.equal(receipt?.platformCode, 40054013);
  });
}
