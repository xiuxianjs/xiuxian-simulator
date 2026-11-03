import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose/index.ts';
import { guidanceFlowActions } from '../../src/expose/guidance-flow.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGuidance, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { allowsGrowthDungeonComparison, playPlanning } from '../../src/agent-play/play-planning.ts';

for (const [request, allowed] of [
  ['如何快速升级，不考虑秘境', false],
  ['如何快速升级，别推荐秘境', false],
  ['如何快速升级，不要执行秘境挑战', true],
  ['如何快速升级，比较秘境和闭关', true]
]) test(`growth planning preserves the requested dungeon comparison scope: ${request}`, () => {
  assert.equal(allowsGrowthDungeonComparison(request), allowed);
  const available = new Set(['get_dungeons', 'get_dungeon_detail_by_id', 'challenge_dungeon_by_id']);
  const plan = playPlanning(request, available)[0];
  assert.ok(plan);
  assert.equal(plan.steps.flatMap(step => step.actions).some(action => /dungeon/u.test(action)), allowed);
  if (!allowed) assert.ok(!plan.steps.flatMap(step => step.missingActions).some(action => /dungeon/u.test(action)));
});

const requests = [
  ['只领主线第一章第一个宝箱，其他奖励不要领', 'claim-rewards', 'daily', 'claim_storyline_chest'],
  ['再核对主线第一章第一个宝箱：没领才领取，已经领过就告诉我', 'claim-rewards', 'daily', 'get_storyline_chapter'],
  ['请 不要领取奖励，但要提升境界', 'raise-realm', 'cultivation', 'get_realm'],
  ['帮我提升境界不要领取奖励', 'raise-realm', 'cultivation', 'get_realm'],
  ['不要领取奖励但要提升境界', 'raise-realm', 'cultivation', 'get_realm'],
  ['如何快速升级，不要领取奖励', 'fast-growth', 'cultivation', 'get_meditation_progress'],
  ['帮我提升境界。先核对当前资格；条件不够就告诉我缺口，不要购买材料、代练或领取奖励。', 'raise-realm', 'cultivation', 'get_realm'],
  ['帮我领取奖励，不要提升境界', 'claim-rewards', 'daily', 'get_checkin_status'],
  ['明天八点采收灵田，不要领取其他奖励', 'scheduled-harvest', 'cave', 'harvest_cave_plots'],
  ['如何快速升级', 'fast-growth', 'cultivation', 'get_meditation_progress'],
  ['帮我提升境界', 'raise-realm', 'cultivation', 'promote_realm'],
  ['帮我领取奖励', 'claim-rewards', 'daily', 'get_checkin_status'],
  ['明天八点帮我领取灵田灵药', 'scheduled-harvest', 'cave', 'harvest_cave_plots']
];
for (const [request, goal, topic, action] of requests) test(`real provider publishes a current plan without gameplay writes: ${goal}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: goal, text: request });
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    const response = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal(response.ok, true, JSON.stringify(response));
    const context = response.data;
    assert.equal(context.topic, topic);
    assert.equal(context.planning[0].id, goal);
    const steps = context.planning[0].steps;
    assert.ok(steps.some(step => step.actions.includes(action)));
    assert.deepEqual(steps.flatMap(step => step.missingActions), []);
    if (goal === 'fast-growth') {
      const comparison = steps.find(step => step.purpose === '比较主动历练与闭关');
      assert.deepEqual(comparison.actions, ['get_dungeons', 'get_dungeon_detail_by_id', 'get_pk_targets']);
      assert.match(comparison.instruction, /缺少修为收益时明确无法定量比较/);
      assert.match(comparison.instruction, /单位精力修为=基础修为÷每场精力/);
      assert.match(comparison.instruction, /所需精力=场次×每场精力/);
      assert.match(comparison.instruction, /不能外推到未读取的关卡/);
      assert.match(comparison.instruction, /玩家排除的玩法不继续查询或推荐/);
      const execution = steps.find(step => step.purpose === '选择本次修行');
      assert.ok(execution.actions.includes('challenge_dungeon_by_id'));
      assert.ok(execution.actions.includes('rob_player'));
      assert.match(execution.instruction, /不把“如何快速升级”当作战斗授权/);
    }
    if (request.includes('主线第一章')) {
      const actions = steps.flatMap(step => step.actions);
      assert.ok(actions.includes('get_storyline_chapter'));
      assert.ok(actions.includes('claim_storyline_chest'));
      assert.ok(!actions.includes('get_task_panel'));
      assert.ok(!actions.includes('checkin_all'));
      assert.ok(!actions.includes('claim_all_storyline_chests'));
      assert.match(JSON.stringify(steps), /指定一只宝箱只用单箱能力/);
    }
    assert.ok(steps.some(step => step.actions.includes('get_tianshu')));
    // A goal is not authorization; publishing its plan must not register a character or settle anything.
    assert.equal(context.current.lastAction, '');
    const routed = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'route_conversation', { active: true });
    assert.equal(routed.data.decision, 'matched');
    if (goal === 'scheduled-harvest') assert.match(JSON.stringify(steps), /固定文字通知和聊天自主唤醒不能替代定时采收/);
  }, event, 'xiuxian-game');
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 0);
});

test('missing capabilities stay explicit and a goal plan reaches the actual model preparation context', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const empty = { type: 'object', properties: {}, additionalProperties: false };
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'partial-planning', text: '帮我提升境界' });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [{ name: 'xiuxian.player.v1', description: 'partial', actions: {
      ...guidanceFlowActions,
      get_tianshu: Expose.action({ description: 'read design', effect: 'read', inputSchema: empty, outputSchema: empty, handler: () => { throw new Error('planning must not execute steps'); } })
    } }]);
    rememberGuidance({ accountExists: true });
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson ?? '{}')) }];
    const engine = gameGuidance(tools, event.MessageText);
    const prompt = await engine.prepare({ signal: new AbortController().signal });
    assert.match(prompt, /raise-realm/);
    assert.match(prompt, /下一境界条件/);
    const response = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal(response.ok, true, JSON.stringify(response));
    const steps = response.data.planning[0].steps;
    assert.deepEqual(steps.flatMap(step => step.actions), ['get_tianshu']);
    assert.ok(steps.flatMap(step => step.missingActions).includes('get_realm'));
    assert.ok(steps.flatMap(step => step.missingActions).includes('promote_realm'));
    endGuidance(event);
  }, event, 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  assert.equal(run.messages.length, 0);
});

for (const [request, topic] of [['帮我快速升级装备', 'inventory'], ['如何升级功法', 'skills'], ['宝物突破', 'skills']]) test(`specific growth object does not become character advancement: ${request}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `specific-${topic}`, text: request });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    const response = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal(response.ok, true, JSON.stringify(response));
    assert.equal(response.data.topic, topic);
    assert.deepEqual(response.data.planning, []);
  }, event, 'xiuxian-game');
  assert.deepEqual(run.errors, []);
});
