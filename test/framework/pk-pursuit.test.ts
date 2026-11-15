import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import pursuit from '../../src/response/pkPursuit/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => shutdownLogger());

const reference = 'r1_2gosa7pa2gv_pf_midnight_1234567890abcdef12345678';
const secondReference = 'r1_2gosa7pa2gu_pf_midnight_1234567890abcdef12345679';
const publish = 'r1_2gosa7pa2gv_pp_midnight_1234567890abcdef12345678';
const offer = { reportId: Number.MAX_SAFE_INTEGER, defenderName: '玄夜', bounty: 300, loss: 15, deadline: '2026-11-16T21:00:00+08:00', fighting: false };

test('追击榜和预览按钮原样往返，第二个确认展示正在交手，截断的按钮不提交', async t => {
  let previews = 0;
  let confirms = 0;
  const { app, requests } = await gameFixture(t, r => {
    const operation = r.path.split('/').at(-1);
    if (operation === 'pvp.pursuit-board') {
      return businessEnvelope(r.bid, { items: [offer], page: 1, count: 6 });
    }
    if (operation === 'pvp.pursuit-fight-preview') {
      return businessEnvelope(r.bid, { ...offer, defenderShare: 5, recycled: 10, confirmation: ++previews === 1 ? reference : secondReference });
    }
    if (++confirms === 1) {
      return businessEnvelope(r.bid, { reportId: offer.reportId, state: 'lost', bounty: 0, loss: 15, defenderShare: 5, recycled: 10 });
    }
    return businessEnvelope(r.bid, undefined, [{ title: '', heading: '', text: '正在交手', buttons: [], advice: [] }]);
  });

  const view = async (text: string, userId?: string) => {
    const result = await app.runHandler(pursuit, app.events.privateMessage({ text, userId, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(result.messages[0].nodes);
  };
  const board = await view('/追击榜');
  assert.match(board.text, /玄夜.*9007199254740991/s);
  assert.match(board.text, /战败损失：15 灵晶/);
  assert.ok(board.commands.includes('/追击榜 2'));
  const help = board.commands.find(cmd => cmd.startsWith('/帮追回 '));
  assert.ok(help);
  const preview = await view(help);
  assert.match(preview.text, /劫匪实收 5 · 系统回收 10/);
  assert.ok(preview.commands.includes('/追击榜'));
  const confirm = preview.commands.find(cmd => cmd.startsWith('/确认追击 '));
  assert.equal(confirm, '/确认追击 ' + reference);
  assert.ok([...confirm!].length <= 80);
  const otherPreview = await view(help, 'second-pursuer');
  const otherConfirm = otherPreview.commands.find(cmd => cmd.startsWith('/确认追击 '));
  assert.equal(otherConfirm, '/确认追击 ' + secondReference);
  const outcome = await view(confirm!);
  assert.match(outcome.text, /未能追回，损失 15 灵晶/);
  assert.deepEqual(requests[3].body.arguments, { confirmation: reference });
  assert.match((await view(otherConfirm!, 'second-pursuer')).text, /正在交手/);
  assert.deepEqual(requests[4].body.arguments, { confirmation: secondReference });
  assert.match((await view(confirm!.slice(0, -1))).text, /指令参数无效/);
  assert.equal(requests.length, 5);
});

test('自填赏金预览与确认仅传服务端短引用', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { reportId: offer.reportId, bounty: 600, deadline: offer.deadline, confirmation: publish }));
  const preview = await app.runHandler(pursuit, app.events.groupMessage({ text: `/委托追回 ${offer.reportId} 600`, platform: 'qq-bot' }));
  assert.equal(preview.messages.length, 1);
  assert.equal(preview.actions[preview.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(preview.messages[0].nodes);
  assert.match(view.text, /托管：600 灵晶/);
  assert.ok(view.commands.includes(`/争夺战报 ${offer.reportId}`));
  const confirm = view.commands.find(cmd => cmd.startsWith('/确认追回 '));
  assert.equal(confirm, `/确认追回 ${publish}`);
  assert.ok([...confirm!].length <= 80);
  const result = await app.runHandler(pursuit, app.events.groupMessage({ text: confirm!, platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(inspectMessage(result.messages[0].nodes).text, /已发布，托管 600 灵晶/);
  assert.deepEqual(requests.map(r => r.body.arguments), [{ reportId: offer.reportId, bounty: 600 }, { confirmation: publish }]);
});
