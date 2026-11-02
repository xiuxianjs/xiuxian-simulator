import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import forge from '../../src/response/profession/forge/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());
const fixture = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));
for (const [command, key, prefix] of [['/打造 1', 'preview', '/确认打造 '], ['/委托锻造 1 1 7', 'orderPreview', '/确认锻造委托 ']]) {
  test(`${command} 实际发送仅接受80字符内确认入口`, async t => {
    let token = 'f1_' + 'a'.repeat(80 - [...prefix].length - 3);
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...fixture[key], token }));
    for (const oversized of [false, true]) {
      if (oversized) token += 'a';
      const result = await app.runHandler(forge, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const raw = JSON.stringify(result.messages[0].nodes);
      if (oversized) {
        assert.ok(!raw.includes(prefix + token));
        assert.ok(result.messages[0].text.includes('确认服务暂不可用'));
      } else assert.ok(raw.includes(prefix + token));
    }
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.path.endsWith('preview')));
  });
}
