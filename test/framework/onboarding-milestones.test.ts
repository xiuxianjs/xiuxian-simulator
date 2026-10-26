import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import master from '../../src/response/master/info/res';
import achievements from '../../src/response/achievements/route/res';
import profession from '../../src/response/profession/myProfession/res';
import meridians from '../../src/response/meditation/meridian/res';
import soul from '../../src/response/soulPath/path/res';
import { businessEnvelope, gameFixture } from './fixture';

// Analytics batching uses native timers outside app.clock. Discard its pending
// flushes at suite exit rather than letting them outlive each isolated app.
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

// Check the commands actually taught by Go against the real ordinary bot
// handlers. A middleware response stops before business rendering; HTTP,
// serialization, hooks and operation selection remain real.
const sourceURL = new URL('../../../xiuxian-game-server/internal/service/robot_onboarding_milestone.go', import.meta.url);
const source = existsSync(sourceURL) ? readFileSync(sourceURL, 'utf8') : '';
const courses = [...source.matchAll(/\{"([^"\n]+)", "([^"\n]+)", "([^"\n]+)", "[^"\n]+"\}/g)];
if (source) assert.equal(courses.length, 6);
else test('阶段教学指令跨项目校验需要相邻服务端源码', { skip: true }, () => {});
const handlers = { '/我的师门': master, '/成就': achievements, '/我的职业': profession, '/经络': meridians, '/元婴道途': soul };

for (const [, anchor, command, operation] of courses) {
  test(`天书 ${anchor} 教学指令与普通入口请求同一业务：${command}`, async t => {
    const handler = handlers[command as keyof typeof handlers];
    assert.ok(handler, `No real handler for ${command}`);
    const { app, requests } = await gameFixture(t, request => {
      const envelope = businessEnvelope(request.bid, undefined);
      return { ...envelope, success: true, branch: 'middleware', middleware: { ...envelope.middleware, outcome: 'reject', reason: 'MUTED' } };
    });
    const event = app.events.groupMessage({ text: command, platform: 'qq-bot' });
    Object.assign(event, { __route: { text: command.replace(/^\//, '') } });
    const result = await app.runHandler(handler, event);
    assert.equal(requests.length, 1, JSON.stringify(result.messages));
    assert.equal(requests[0].path, `/api/v2/robot/business/${operation}`);
    assert.equal(requests[0].body.messageText, command);
    assert.deepEqual(requests[0].body.arguments, {});
    assert.equal(result.messages.length, 0, 'middleware response must not fabricate a business receipt');
  });
}
