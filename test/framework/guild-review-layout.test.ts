import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import review from '../../src/response/guild/reviewApplications/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

test('宗门审核的同意和拒绝保持在对应申请者引用行内', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    hasGuild: true, canReview: true, isDeputy: false, guildName: '在人间', roleName: '宗主',
    currentPage: 1, totalPages: 1, total: 2,
    applications: [1001829, 1001830].map((userId, index) => ({
      id: index + 1, userId, userName: `申请者${index + 1}`, realmName: '筑基后期', createdAt: null
    }))
  }));
  for (const privateChat of [false, true]) {
    const event = privateChat
      ? app.events.privateMessage({ text: '/宗门审核', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/宗门审核', platform: 'qq-bot' });
    const result = await app.runHandler(review, event);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const quotes = nodes.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 2);
    const rendered = createMarkdownText(nodes);
    assert.doesNotMatch(rendered, /```|^ {4}\S/m);
    for (const [index, userId] of [1001829, 1001830].entries()) {
      const quote = quotes[index];
      assert.ok(Array.isArray(quote.value));
      if (!Array.isArray(quote.value)) throw new Error('Expected structured quote');
      assert.deepEqual(quote.value.filter(node => node.type === 'MD.button').map(node => node.value), ['‹同意›', '‹拒绝›']);
      assert.deepEqual(quote.value.filter(node => node.type === 'MD.button').map(node => node.options?.data), [
        `/宗门审核同意 ${userId}`, `/宗门审核拒绝 ${userId}`
      ]);
      const lines = rendered.split('\n').filter(line => line.includes(`text="/宗门审核同意 ${userId}"`));
      assert.equal(lines.length, 1);
      assert.match(lines[0], /^> 【/);
      assert.ok(lines[0].includes(`申请者${index + 1}`));
      assert.ok(lines[0].includes(`text="/宗门审核拒绝 ${userId}"`));
      assert.ok(lines[0].includes('show="‹同意›"'));
      assert.ok(lines[0].includes('show="‹拒绝›"'));
    }
  }
});
