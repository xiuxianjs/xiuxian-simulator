import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(shutdownLogger);

for (const automatic of [false, true]) {
  test(automatic ? 'QQ 自动刷新确认按钮往返' : 'QQ 手动刷新确认按钮往返', async t => {
    const kind = automatic ? 'i' : 'j';
    const reference = `r1_3w5e11264sgsf_${kind}_1y2p0ij32e8e7_${'a'.repeat(24)}`;
    const input = automatic ? '/宗门商店自动刷新 8 12 20' : '/宗门商店 刷新';
    const cancel = automatic ? '/宗门商店自动刷新' : '/宗门商店';
    const confirmation = automatic ? { mode: 'confirm', reference } : { reference };
    const { app, requests } = await gameFixture(t, request => {
      const args = request.body.arguments as Record<string, unknown>;
      if (args.preview) {
        return businessEnvelope(request.bid, { outcome: 'preview', reference, ...(automatic ? { hours: [8, 12, 20] } : { cost: 1000 }) });
      }
      return businessEnvelope(request.bid, automatic
        ? { outcome: 'set', data: { outcome: 'updated', enabled: true, hours: [8, 12, 20], version: '2:state', isLeader: true, isViceLeader: false } }
        : { receipt: { guildId: 12, cost: 1000, remaining: 1, itemCount: 6 }, pageError: '商店页面暂不可用' });
    });
    await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
    const run = async (text: string) => {
      const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      return result;
    };
    const preview = await run(input);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, automatic ? { mode: 'hours', hours: [8, 12, 20], preview: true } : { preview: true });
    assert.equal(preview.messages.length, 1);
    const message = preview.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(automatic ? '刷新成功会扣宗门灵石' : '消耗：1000 宗门灵石'), view.text);
    assert.ok(view.text.includes('有效期：60 秒'));
    assert.ok(view.commands.includes(cancel));
    assert.equal(preview.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const command = view.commands.find(value => value.endsWith(reference));
    assert.ok(command);
    assert.ok([...command].length <= 80);
    t.diagnostic(`QQ 按钮 ${[...command].length} 字符、${Buffer.byteLength(command)} 字节`);
    await run(command.slice(0, -1));
    assert.equal(requests.length, automatic ? 2 : 1);
    if (automatic) {
      assert.deepEqual(requests.at(-1)?.body.arguments, { mode: 'invalid' });
    }
    const confirmed = await run(command);
    assert.deepEqual(requests.at(-1)?.body.arguments, confirmation);
    assert.equal(confirmed.messages.length, 1);
    const receipt = confirmed.messages[0];
    assert.ok(inspectMessage(receipt.nodes).text.includes(automatic ? '商店自动刷新设置成功' : '已记入宗门日志'));
    assert.equal(confirmed.actions[receipt.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
