import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { after, test } from 'node:test';
import axios from 'axios';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { register } from '../../node_modules/@alemonjs/qq-bot/lib/register.js';
import community from '../../src/response/notification/community/res';
import type { GameEvent } from '../../src/types/event';

after(() => shutdownLogger());

for (const [role, queriedRole] of [['admin', undefined], ['owner', undefined], ['member', undefined], [undefined, undefined], [undefined, 'admin'], [undefined, 'member']] as const) {
  test(`群欢迎配置使用 QQ 消息角色 ${role ?? '缺失'}（查询 ${queriedRole ?? '失败'}），不把查询失败当作非管理员`, async t => {
    const writes: Record<string, unknown>[] = [];
    t.mock.method(axios, 'create', () => ({
      async post(path: string, body: Record<string, unknown>) {
        if (path.endsWith('/community/settings/read')) return { data: { data: { welcomeEnabled: true, requestReminders: false } } };
        if (path.endsWith('/community/settings/write')) {
          writes.push(body);
          return { data: { data: null } };
        }
        throw new Error(`Unexpected request: ${path}`);
      }
    }));
    const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
    t.after(() => app.dispose());
    let queries = 0;
    app.actions.on('member.info', () => {
      queries++;
      return [queriedRole
        ? { code: ResultCode.Ok, message: 'ok', data: { UserId: 'sender', Role: queriedRole } }
        : { code: ResultCode.Fail, message: 'platform query unavailable', data: null }];
    });
    const client = new EventEmitter();
    const events: GameEvent[] = [];
    app.run(() => register(client as unknown as Parameters<typeof register>[0], {
      botId: 'community-bot', bindActions: false,
      cbp: { send: (event: GameEvent) => events.push(event) } as unknown as NonNullable<Parameters<typeof register>[1]>['cbp']
    }));
    app.run(() => client.emit('GROUP_AT_MESSAGE_CREATE', {
      id: 'command-event', group_openid: 'community-group', content: '/配置群欢迎 开启',
      author: { id: 'sender', member_openid: 'sender', member_role: role }
    }));
    assert.equal(events.length, 1);
    assert.equal(events[0].Role, role);
    const result = await app.runHandler(community, events[0]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const text = inspectMessage(message.nodes).text;
    if (role === 'admin' || role === 'owner' || queriedRole === 'admin') {
      assert.equal(writes.length, 1);
      assert.equal((writes[0].settings as { welcomeEnabled: boolean }).welcomeEnabled, true);
      assert.match(text, /成员欢迎：已开启/);
      assert.equal(queries, role ? 0 : 1);
    } else {
      assert.equal(writes.length, 0);
      assert.match(text, role === 'member' || queriedRole === 'member' ? /仅本群管理员或群主可操作/ : /暂时无法查询你的群身份/);
      assert.equal(queries, role === 'member' ? 0 : 1);
    }
  });
}
