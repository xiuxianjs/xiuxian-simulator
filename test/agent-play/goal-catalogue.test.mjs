import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose/index.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { isFreshObservation } from '../../src/expose/execution-policy.ts';
import { rememberGuidance } from '../../src/agent-play/guidance-session.ts';

const cases = [
  ['如何快速升级，不考虑秘境', ['get_tianshu', 'get_profile', 'get_realm', 'get_meditation_progress', 'get_meditation_boost_options']],
  ['如何快速升级，不要执行秘境挑战', ['get_tianshu', 'get_profile', 'get_realm', 'get_meditation_progress', 'get_meditation_boost_options', 'get_dungeons']],
  ['帮我领取奖励，只领主线第一章第一个宝箱，其他奖励不要领', ['get_tianshu', 'get_storyline_chapters']],
  ['帮我领取奖励，不要领取主线宝箱', ['get_tianshu', 'get_checkin_status', 'get_task_panel', 'get_daily_activity', 'get_weekly_activity', 'get_achievement_overview', 'get_emails']],
  ['如何快速升级', ['get_tianshu', 'get_profile', 'get_realm', 'get_meditation_progress', 'get_meditation_boost_options', 'get_dungeons']],
  ['帮我提升境界', ['get_tianshu', 'get_profile', 'get_realm']],
  ['帮我领取奖励', ['get_tianshu', 'get_checkin_status', 'get_task_panel', 'get_daily_activity', 'get_weekly_activity', 'get_achievement_overview', 'get_emails']],
  ['明天八点采收灵田', ['get_tianshu', 'get_cave']]
];
for (const [request, expected] of cases) test(`real action catalogue selects the correct observation tools: ${request}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const calls = [];
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    rememberGuidance({ protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true });
    for (const action of expected) assert.ok(isFreshObservation(action) || Expose.create().list('xiuxian.player.v1').find(provider => provider.name === 'xiuxian-game').actions[action].effect === 'read');
    for (const action of ['get_soul_path', 'start_meditation', 'promote_realm', 'checkin_all', 'harvest_cave_plots']) {
      assert.equal(isFreshObservation(action), false, `${action} must not become an automatic preparation observation`);
    }
    const provider = Expose.create().list('xiuxian.player.v1').find(provider => provider.name === 'xiuxian-game');
    const tools = ['expose_read', 'expose_write', 'expose_call'].map(name => ({ name, execute: async args => {
      const effect = provider.actions[args.action].effect;
      assert.equal(name, effect === 'read' ? 'expose_read' : effect === 'write' ? 'expose_write' : 'expose_call');
      if (['get_conversation_contract', 'get_execution_policy', 'get_play_context'].includes(args.action)) {
        return Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
      }
      if (args.action === 'get_guidance_state') return { ok: true, data: { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true } };
      calls.push(args.action);
      // Only the business response is a fixture; catalogue, routing, guards and
      // preparation are real. Do not relabel every fixture action as effect=read.
      assert.ok(expected.includes(args.action), `Unexpected action ${args.action}`);
      return { ok: true, data: { success: true, branch: 'business', result: { fact: `${args.action}:ACTUAL_CATALOGUE_FACT`, ...(args.action === 'get_daily_activity' ? { rewards: [{ canClaim: true }] } : {}) } } };
    } }));
    const engine = gameGuidance(tools, request);
    const prompt = await engine.prepare({ signal: new AbortController().signal });
    assert.deepEqual(calls, expected, prompt);
    for (const action of expected) assert.ok(prompt.includes(`${action}:ACTUAL_CATALOGUE_FACT`));
    if (request.startsWith('如何快速升级')) {
      const contracts = JSON.parse(prompt.match(/【本轮成长观察的运行时契约】([^\n]+)/u)[1]);
      for (const contract of contracts) {
        const meta = provider.actions[contract.action];
        assert.deepEqual(contract.inputSchema, meta.inputSchema);
        assert.equal(contract.executionTool, meta.effect === 'read' ? 'expose_read' : meta.effect === 'write' ? 'expose_write' : 'expose_call');
        assert.ok(isFreshObservation(contract.action) || meta.effect === 'read');
      }
      assert.equal(contracts.some(contract => contract.action === 'get_dungeon_detail_by_id'), expected.includes('get_dungeons'));
      assert.ok(!contracts.some(contract => /^(challenge|rob_|claim_|start_)/u.test(contract.action)));
    }
    if (expected.includes('get_dungeons')) {
      assert.match(prompt, /get_dungeons是分页目录/);
      assert.match(prompt, /不等于完整挑战资格/);
      assert.match(prompt, /免费次数减免精力，不能推断其他费用也免费/);
      assert.match(prompt, /当前普通挑战与扫荡不按此字段扣贡献/);
    } else if (request.includes('不考虑秘境')) {
      assert.doesNotMatch(prompt, /【秘境比较边界】/);
    }
    if (request === '帮我提升境界') {
      const contracts = JSON.parse(prompt.match(/【本轮境界操作的运行时契约】([^\n]+)/u)[1]);
      for (const contract of contracts) {
        const meta = provider.actions[contract.action];
        assert.deepEqual(contract.inputSchema, meta.inputSchema);
        assert.equal(contract.executionTool, meta.effect === 'read' ? 'expose_read' : meta.effect === 'write' ? 'expose_write' : 'expose_call');
      }
      assert.ok(contracts.some(contract => contract.action === 'breakthrough_realm'));
      assert.ok(contracts.some(contract => contract.action === 'promote_realm'));
    }
    if (request === '帮我领取奖励') {
      assert.equal(engine.review('这些项目还是查询失败。').accepted, false, 'Current eligibility must win over historical failure text');
      await engine.afterCall({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'claim_all_daily_activity', argumentsJson: '{}' },
        { ok: true, data: { success: true, branch: 'business', replies: [], result: { claimed: [{ issued: [{ name: '灵石', amount: 11 }] }], partial: false } } },
        { signal: new AbortController().signal });
      assert.equal(engine.review('本次领取灵石 ×11 已到账。').accepted, true);
    }
    assert.doesNotMatch(engine.append('先核对条件。'), /ACTUAL_CATALOGUE_FACT/);
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `catalogue-${cases.findIndex(item => item[0] === request)}`, text: request }), 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  assert.equal(run.messages.length, 0);
});
