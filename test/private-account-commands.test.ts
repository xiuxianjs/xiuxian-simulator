import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { logger, withEventContext } from 'alemonjs';
import type { GameEvent } from '../src/types/event';
import { mockBackendConfig } from './backend-config-helper';
import securityCenter from '../src/response/emailSecurity/securityCenter';
import login from '../src/response/emailSecurity/login';
import password from '../src/response/emailSecurity/setPassword';
import bindEmail from '../src/response/emailSecurity/bindEmail';
import changeEmail from '../src/response/emailSecurity/changeEmail';
import changeAccount from '../src/response/emailSecurity/changeAccount';
import verify from '../src/response/emailSecurity/verify';
import switchUid from '../src/response/emailSecurity/switchUid';
import { requirePrivateAccountMessage } from '../src/utils/privateAccountMessage';

test('all public account command handlers stop before querying or changing account data', async t => {
  mockBackendConfig(t, { api_url: 'https://private-account.test', robot_auth_token: 'test-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; throw new Error('public account API must not run'); } }));
  t.mock.method(logger, 'warn', () => undefined);
  t.mock.method(logger, 'error', () => undefined);
  const event = {
    name: 'message.create', value: {}, GuildId: 'group', SpaceId: 'group', ChannelId: 'channel', UserKey: 'fake:user',
    IsMaster: false, IsBot: false, OpenId: 'fake', UserId: 'sender', uid: 1, MessageId: 'test-message',
    Platform: 'private-account-test-unconnected', MessageText: '/安全中心', isPrivate: false,
    Target: { scope: 'group', targetId: 'group' }
  } as GameEvent;
  for (const handler of [securityCenter, login, password, bindEmail, changeEmail, changeAccount, verify, switchUid]) {
    await withEventContext(event, () => {}, async () => { await handler.current(event); });
  }
  assert.equal(calls, 0);
  assert.equal(await requirePrivateAccountMessage({ isPrivate: true, UserId: 'sender' }), true);
});
