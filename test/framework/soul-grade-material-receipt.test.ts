import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import grade from '../../src/response/soulArtifact/gradeUp/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

// Sanitized shape of the 2026-10-25 production refusal: no data property,
// empty title/heading, a text block, false settlement flags and complete entry.
for (const explicit of [false, true]) {
  test(`同名不同品材料不足原回执保留，不变成结果未知：explicit=${explicit}`, async t => {
    const reason = '需要 3 个同名灵器本命物，当前只有 0 个';
    const { app, requests } = await gameFixture(t, request => ({
      success: false, branch: 'business',
      middleware: {
        outcome: 'allow', reason: 'ALLOWED',
        identity: { bid: request.bid, account: { status: 'registered', playerId: 1 } },
        replies: [{ text: reason, title: '', heading: '', advice: [], buttons: [], blocks: [{ text: reason, quoted: false }] }],
        contextWarnings: [],
        mute: { muted: false, claimed: false, replyCount: 0, muteTtlSeconds: -2, muteUnlockTime: '', replyTtlSeconds: -2 },
        entry: { agreements: [{ type: 'terms', index: 1, title: '游戏使用协议许可及服务协议' }, { type: 'privacy', index: 2, title: '游戏隐私政策' }, { type: 'children', index: 3, title: '游戏儿童个人信息保护规则及监护人须知' }], maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, agreementAccepted: true, nativeComebackProcessed: false }
      }
    }));
    const result = await app.runHandler(grade, app.events.groupMessage({ text: explicit ? '/本命物升品 156' : '/本命物升品', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/soul-artifacts.grade-upgrade');
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('本命物 · 升品'), view.text);
    assert.ok(view.text.includes('需要：同名灵器 ×3'), view.text);
    assert.ok(view.text.includes('可用：0 件'), view.text);
    assert.ok(view.text.includes('同名且同品'), view.text);
    assert.ok(!view.text.includes('未获完整确认'), view.text);
    assert.ok(view.commands.includes('/储物袋 本命'));
    const rendered = message.nodes.filter(node => node.type === 'Markdown').map(node => createMarkdownText(node.value)).join('\n');
    assert.match(rendered, /^>.*需要：同名灵器 ×3/m);
    assert.match(rendered, /^>.*可用：0 件/m);
    assert.match(rendered, /^>.*text="\/储物袋 本命"/m);
    assert.ok(!rendered.split('\n').find(line => line.includes('text="/本命物信息"'))?.startsWith('>'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const kind of ['success', 'unknown', 'http'] as const) {
  test(`升品气泡分层展示：${kind}`, async t => {
    const { app, requests } = await gameFixture(t, request => kind === 'http'
      ? { code: 'CONFLICT', message: '需要 3 个同名灵器本命物，当前只有 0 个' }
      : businessEnvelope(request.bid, kind === 'unknown' ? {} : {
        artifact: { id: 9, artifactId: 7, name: '天火符', gradeId: 4, level: 23 },
        consumed: 3, previousGrade: 3, newGrade: 4, previousGradeName: '灵器', newGradeName: '灵宝'
      }), kind === 'http' ? 409 : 200);
    const result = await app.runHandler(grade, app.events.privateMessage({ text: '/本命物升品 9', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('本命物 · 升品'), view.text);
    assert.ok(view.commands.includes('/本命物信息'));
    assert.ok(view.commands.includes('/本命物详情 9'));
    assert.ok(!view.commands.some(command => command.startsWith('/本命物升品')));
    assert.ok(!view.text.includes('原回执'));
    assert.ok(!view.text.includes('核对筑灵石'));
    if (kind === 'success') {
      assert.ok(view.text.includes('「天火符」升品成功'));
      assert.ok(view.text.includes('品级：灵器 → 灵宝'));
      assert.ok(view.text.includes('消耗：同名灵器 ×3'));
    } else if (kind === 'unknown') {
      assert.ok(view.text.includes('暂未确认本次升品结果。'));
      assert.ok(view.text.includes('暂勿重复升品'));
      assert.ok(!view.text.includes('材料不足'));
      assert.ok(!view.text.includes('升品失败'));
    } else {
      assert.ok(view.text.includes('需要：同名灵器 ×3'));
      assert.ok(view.text.includes('可用：0 件'));
    }
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
