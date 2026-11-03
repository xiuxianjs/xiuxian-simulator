import test from 'node:test';
import assert from 'node:assert/strict';
import { growthFacts, contradictsGrowthBalance, contradictsGrowthDuration } from '../../src/agent-play/growth-facts.ts';

const facts = [
  { action: 'get_profile', result: { ok: true, data: { found: true, user: { experience: 25, mentalValue: 90 }, realm: { name: '炼气一层', experienceLimit: 200 } } } },
  { action: 'get_meditation_boost_options', result: { ok: true, data: { success: true, branch: 'business', result: { spiritStone: 10, autoEnabled: false, pricePerInterval: 25, intervalMinutes: 15 } } } },
  { action: 'get_meditation_progress', result: { ok: true, data: { success: false, reason: 'not_started', maxDurationMinutes: 7200, maxDurationHours: 0 } } }
];
test('growth fallback uses current balance and current realm gap, not historical guesses', () => {
  const result = growthFacts(facts);
  assert.equal(result.spiritStone, 10);
  assert.match(result.text, /灵石：10/);
  assert.match(result.text, /还差175/);
  assert.match(result.text, /每15分钟需25灵石/);
  assert.doesNotMatch(result.text, /每次升级|已经突破|已经领奖/);
  for (const reply of ['灵石0，灵晶450', '灵石余额为0', '现在只有0灵石，开不了', '手上有9灵石']) assert.equal(contradictsGrowthBalance(reply, result), true, reply);
  for (const reply of ['灵石10，灵晶450', '现在只有10灵石', '每15分钟25灵石', '需要25灵石，但余额不足']) assert.equal(contradictsGrowthBalance(reply, result), false, reply);
});
test('missing or rejected observations never become zero balance facts', () => {
  assert.equal(growthFacts(facts.slice(0, 1)), undefined);
  for (const result of [
    { ok: false, data: facts[1].result.data },
    { ok: true, data: { ...facts[1].result.data, success: false } },
    { ok: true, data: { ...facts[1].result.data, branch: 'middleware' } },
    { ok: true, data: { ...facts[1].result.data, result: { spiritStone: '10' } } }
  ]) assert.equal(growthFacts([facts[0], { action: facts[1].action, result }]), undefined);
});

test('conflicting model balance is replaced before the real Markdown send', async t => {
  const { Expose, registerExpose, useMessage } = await import('alemonjs');
  const { createTestApp } = await import('alemonjs/testing');
  const { gameExpose } = await import('../../src/expose/index.ts');
  const { gameGuidance } = await import('../../src/agent-play/game-guidance.ts');
  const { rememberGuidance } = await import('../../src/agent-play/guidance-session.ts');
  const { createChatReplyFormat } = await import('../../../alemonjs-agent-link/lib/dsh/reply-format.js');
  const app = createTestApp();
  t.after(() => app.dispose());
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    rememberGuidance({ protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true });
    const tools = ['expose_read', 'expose_write', 'expose_call'].map(name => ({ name, execute: async args => {
      if (['get_conversation_contract', 'get_execution_policy', 'get_play_context'].includes(args.action)) return Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
      if (args.action === 'get_guidance_state') return { ok: true, data: { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true } };
      const fact = facts.find(item => item.action === args.action);
      if (fact) return fact.result;
      assert.ok(['get_tianshu', 'get_realm', 'get_meditation_progress'].includes(args.action));
      return { ok: false, error: { code: 'fixture-unavailable' } };
    } }));
    const engine = gameGuidance(tools, '如何快速升级');
    const ctx = { signal: new AbortController().signal };
    await engine.prepare(ctx);
    for (const { action } of facts) await tools.find(tool => tool.name === 'expose_write').execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: '{}' }, ctx);
    const text = engine.append('你现在灵石0，所以什么也做不了。[[返回玩法目录]]');
    const durationText = engine.append('闭关默认每15分钟给6.25修为，一天最多12小时。[[返回玩法目录]]');
    assert.match(durationText, /7200分钟，即120小时/u);
    assert.doesNotMatch(durationText, /最多12小时/u);
    assert.ok((await useMessage()[0].send({ format: createChatReplyFormat(durationText, 'qq-bot') })).every(receipt => receipt.code === 2000));
    assert.doesNotMatch(text, /灵石0|什么也做不了/);
    assert.match(text, /灵石：10/);
    const receipts = await useMessage()[0].send({ format: createChatReplyFormat(text, 'qq-bot') });
    assert.ok(receipts.length && receipts.every(receipt => receipt.code === 2000));
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'growth-balance', text: '如何快速升级' }), 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  assert.ok(run.messages.some(message => message.text.includes('灵石：10')));
});


test('meditation duration uses minutes and a single-session cap, never inactive placeholder hours', () => {
  const current = growthFacts(facts);
  assert.equal(current.maxDurationHours, 120);
  assert.match(current.text, /7200分钟，即120小时/u);
  for (const reply of ['闭关最多12小时。', '闭关默认每15分钟给6.25修为，一天最多12小时。', '单次闭关上限为12小时。', '闭关每天最多120小时。']) {
    assert.equal(contradictsGrowthDuration(reply, current), true, reply);
  }
  for (const reply of ['单次闭关最长120小时。', '闭关时长上限为120小时。', '建议先闭关1小时，再查看实际结果。', '每日任务最多1小时做完，之后去闭关。']) {
    assert.equal(contradictsGrowthDuration(reply, current), false, reply);
  }
  for (const [minutes, hours] of [[90, 1.5], [720, 12], [14400, 240]]) {
    const changed = growthFacts([...facts.slice(0, 2), { action: 'get_meditation_progress', result: { ok: true, data: { success: true, maxDurationMinutes: minutes } } }]);
    assert.equal(changed.maxDurationHours, hours);
    assert.equal(contradictsGrowthDuration(`单次闭关最长${hours}小时。`, changed), false);
  }
  for (const progress of [{ ok: false }, { ok: true, data: { success: false, reason: 'unavailable', maxDurationMinutes: 7200 } }, { ok: true, data: { reason: 'not_started', maxDurationHours: 0 } }]) {
    const unknown = growthFacts([...facts.slice(0, 2), { action: 'get_meditation_progress', result: progress }]);
    assert.equal(unknown.maxDurationHours, undefined);
    assert.doesNotMatch(unknown.text, /闭关时长上限/u);
  }
});
