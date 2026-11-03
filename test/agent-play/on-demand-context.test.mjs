import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose/index.ts';
import { rememberGuidance, rememberDeliveredDialogue, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';

for (const scenario of ['question', 'prologue-choice', 'lesson-choice']) test(`real lifecycle startup is metadata-only: ${scenario}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const calls = [];
  const input = scenario === 'question' ? '修仙怎么玩' : scenario === 'prologue-choice' ? '继续' : '签到';
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `demand-${scenario}`, messageId: `demand-${scenario}`, text: input });
  const run = await app.runHandler(async () => {
    const configs = gameExpose.getConfigs().map(config => config.name !== 'xiuxian.player.v1' ? config : {
      ...config,
      actions: Object.fromEntries(Object.entries(config.actions).map(([name, action]) => [name,
        ['get_guidance_state', 'get_onboarding', 'continue_registration_guide', 'perform_onboarding_action', 'register_player', 'get_tianshu'].includes(name)
          ? { ...action, handler: () => { calls.push(name); throw new Error('startup must not invoke player-state or gameplay'); } }
          : action
      ]))
    });
    registerExpose('xiuxian-game', configs);
    if (scenario !== 'question') {
      rememberGuidance({ protocol: 'plugin-guidance.v1', flow: scenario === 'prologue-choice' ? 'prologue' : 'onboarding', step: 'prologue_2', accountExists: true, actions: [{ label: '继续', capability: 'continue_registration_guide' }] });
      if (scenario === 'lesson-choice') guidanceSession().lesson = { version: 17, phase: 'lesson', actions: [{ label: '签到', command: '/签到' }] };
      const receipt = await useMessage()[0].send({ format: createChatReplyFormat(`[[${input}]]`, 'qq-bot') });
      assert.ok(receipt.length && receipt.every(item => item.code === 2000));
      rememberDeliveredDialogue(`[[${input}]]`);
    }
    const start = await Expose.create().call('agent.conversation.v1', 'xiuxian-game', 'start', {});
    assert.equal(start.ok, true, JSON.stringify(start));
    assert.deepEqual(calls, [], 'opening an AI turn cannot query the world or advance a choice');
    assert.match(start.data.prompt, /准备对话没有读取角色状态/);
    assert.doesNotMatch(start.data.prompt, /已由插件尝试一次|玩家已点击送达/);
    const guide = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_conversation_contract', {});
    assert.equal(guide.ok, true);
    assert.ok(guide.data.entryPoints.some(entry => entry.action === 'get_tianshu'));
    const actions = Expose.create().list('xiuxian.player.v1').find(provider => provider.name === 'xiuxian-game').actions;
    assert.ok(guide.data.entryPoints.every(entry => actions[entry.action]));
    if (scenario === 'lesson-choice') {
      const context = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
      assert.equal(context.ok, true, JSON.stringify(context));
      assert.equal(context.data.current.lesson.version, 17);
      assert.deepEqual(context.data.current.lesson.actions, [{ label: '签到', command: '/签到' }]);
    }
    assert.deepEqual(calls, []);
    endGuidance(event);
  }, event, 'xiuxian-game');
  assert.deepEqual(run.errors, []);
});
