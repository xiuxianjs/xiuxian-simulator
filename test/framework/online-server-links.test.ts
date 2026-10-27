import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import encyclopedia from '../../src/response/encyclopedia/res';
import detail from '../../src/response/encyclopedia/detail/res';
import { createLoginReply } from '../../src/response/emailSecurity/login';
import { sendBattleResult } from '../../src/utils/battleMemoryMessage';
import { useMessage } from '../../src/utils/useMessage';

after(() => shutdownLogger());

for (const channelMode of [undefined, false, true]) {
  test(`online links preserve business parameters with channel_mode=${channelMode}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123456' }, 'xiuxian-game': { backend: { channel_mode: channelMode, api_url: 'https://channel.example.com', robot_auth_token: 'offline-token' } } } });
    t.after(() => app.dispose());
    app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
    const event = app.events.privateMessage({ text: '/图鉴 装备 武器', platform: 'qq-bot', botId: '123456', userId: 'owner' });
    const browse = await app.runHandler(encyclopedia, event);
    const entry = await app.runHandler(detail, app.events.privateMessage({ text: '/图鉴详情 装备 123', platform: 'qq-bot', botId: '123456', userId: 'owner' }));
    const other = await app.runHandler(async () => {
      const [message] = useMessage();
      await sendBattleResult(message, { bid: event.UserId, isPrivate: true, bar: false }, [{ id: '战斗 /?#' }]);
      await message.send(createLoginReply({ code: 'OK', data: {
        playerId: 123, temporaryPassword: '01234567', email: 'a+b@example.com', expiresAt: '2026-10-28T00:00:00Z', expiresIn: 1800
      } }, true, event.UserId));
    }, event);
    const urls: URL[] = [];
    for (const result of [browse, entry, other]) {
      assert.deepEqual(result.errors, []);
      assert.ok(result.messages.length > 0);
      for (const message of result.messages) {
        assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
        for (const node of message.nodes) {
          if (node.type !== 'BT.group') continue;
          for (const button of node.value.flatMap(row => row.value)) {
            if (button.options?.type === 'link') urls.push(new URL(String(button.options.data)));
          }
        }
      }
    }
    assert.equal(urls.length, 5);
    for (const url of urls) {
      assert.equal(url.origin, 'https://tatian-online.alemonjs.com');
      assert.deepEqual(url.searchParams.getAll('server'), channelMode ? ['channel'] : []);
    }
    assert.equal(urls[0].searchParams.get('category'), '装备');
    assert.equal(urls[0].searchParams.get('subCategory'), '武器');
    assert.equal(urls[1].searchParams.get('entryId'), '123');
    assert.equal(decodeURIComponent(urls[2].pathname), '/components/battle-memory/战斗 /?#');
    assert.equal(urls[2].hash, '');
    assert.equal(urls[3].searchParams.get('temporaryPassword'), '01234567');
    assert.equal(urls[3].searchParams.get('UID'), '123');
    assert.equal(urls[4].searchParams.get('UID'), '123');
    assert.equal(urls[4].searchParams.get('loginMethod'), 'email');
    assert.equal(urls[4].searchParams.get('email'), 'a+b@example.com');
  });
}
