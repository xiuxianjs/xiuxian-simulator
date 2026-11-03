import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goalEvidence } from '../../src/agent-play/goal-evidence.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const text = { type: 'string' };
const empty = object({});
for (const scenario of ['gameplay', 'fast-growth', 'claim-rewards', 'claim-rewards-failure', 'scheduled-harvest', 'registration', 'prologue', 'onboarding', 'read-fails', 'write-disguised', 'stale']) test(`goal preparation uses real provider facts without writes: ${scenario}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const calls = [];
  const request = { 'fast-growth': '如何快速升级', 'claim-rewards': '帮我领取奖励', 'scheduled-harvest': '明天八点帮我采收灵田' }[scenario === 'claim-rewards-failure' ? 'claim-rewards' : scenario] || '帮我提升境界';
  const expected = { 'fast-growth': ['get_tianshu', 'get_profile', 'get_realm', 'get_meditation_progress', 'get_meditation_boost_options', 'get_dungeons'], 'claim-rewards': ['get_tianshu', 'get_checkin_status', 'get_task_panel', 'get_daily_activity', 'get_weekly_activity', 'get_achievement_overview', 'get_emails'], 'scheduled-harvest': ['get_tianshu', 'get_cave'] }[scenario === 'claim-rewards-failure' ? 'claim-rewards' : scenario] || ['get_tianshu', 'get_profile', 'get_realm'];
  let stale = false;
  const run = await app.runHandler(async () => {
    const actions = {
      route_conversation: Expose.action({ description: 'route', effect: 'read', inputSchema: { type: 'object', properties: { active: { type: 'boolean' }, flow: text, hasNameDraft: { type: 'boolean' }, choices: { type: 'array', items: text } }, additionalProperties: false }, outputSchema: object({ protocol: text, decision: text }), handler: () => ({ protocol: 'plugin-conversation-route.v1', decision: 'matched' }) }),
      get_guidance_state: Expose.action({ description: 'current flow', effect: 'read', inputSchema: { type: 'object', properties: { conversationMode: text }, additionalProperties: false }, outputSchema: object({ protocol: text, flow: text, accountExists: { type: 'boolean' } }), handler: () => ({ protocol: 'plugin-guidance.v1', flow: ['registration','prologue','onboarding'].includes(scenario) ? scenario : 'gameplay', accountExists: scenario !== 'registration' }) })
    };
    for (const name of ['get_tianshu', 'get_profile', 'get_realm', 'get_meditation_progress', 'get_meditation_boost_options', 'get_checkin_status', 'get_task_panel', 'get_daily_activity', 'get_weekly_activity', 'get_achievement_overview', 'get_emails', 'get_cave', 'get_dungeons']) actions[name] = Expose.action({ description: name, effect: scenario === 'write-disguised' && name === 'get_realm' ? 'write' : 'read', inputSchema: empty, outputSchema: object({ fact: text }), handler: () => {
      calls.push(name);
      if (scenario === 'claim-rewards-failure' && name === 'get_emails') throw new Error('unavailable');
      if (scenario === 'read-fails' && name === 'get_realm') throw new Error('unavailable');
      if (scenario === 'stale') stale = true;
      return { fact: `${name}:CURRENT_PROVIDER_FACT` };
    } });
    registerExpose('xiuxian-game', [{ name: 'xiuxian.player.v1', description: 'fixture', actions }]);
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
    const engine = gameGuidance(tools, request, () => stale);
    const ctx = { signal: new AbortController().signal };
    const initial = await engine.prepare(ctx);
    assert.deepEqual(calls, [], 'preparation cannot query player facts');
    assert.doesNotMatch(initial, /CURRENT_PROVIDER_FACT/);
    const readers = new Map(Object.entries(actions).filter(([, meta]) => meta.effect === 'read').map(([action]) => [action, tools[0]]));
    const prompt = ['registration','prologue','onboarding'].includes(scenario) ? initial : await goalEvidence(request, readers, ctx, () => stale);
    if (scenario === 'stale') { assert.equal(prompt, ''); assert.deepEqual(calls, ['get_tianshu']); }
    else if (['registration', 'prologue', 'onboarding'].includes(scenario)) { assert.deepEqual(calls, []); assert.doesNotMatch(prompt, /CURRENT_PROVIDER_FACT/); }
    else {
      assert.match(prompt, /get_tianshu:CURRENT_PROVIDER_FACT/);
      for (const action of expected.filter(action => action !== 'get_realm' && !(scenario === 'claim-rewards-failure' && action === 'get_emails'))) assert.ok(prompt.includes(`${action}:CURRENT_PROVIDER_FACT`));
      if (scenario === 'write-disguised') { assert.deepEqual(calls, ['get_tianshu', 'get_profile']); assert.match(prompt, /当前未注册可用的观察能力/); }
      else if (scenario === 'read-fails') { assert.doesNotMatch(prompt, /get_realm:CURRENT_PROVIDER_FACT/); }
      else if (scenario === 'claim-rewards-failure') {
        assert.deepEqual(calls, expected);
        const reply = engine.append('上次领取了灵石 ×11。这次没有遗漏任何可领取的项目。');
        await useMessage()[0].send({ format: createChatReplyFormat(reply, 'qq-bot') });
        const unexecuted = engine.append('10 积分奖励已直接领到手，灵晶×11。');
        await useMessage()[0].send({ format: createChatReplyFormat(unexecuted, 'qq-bot') });
      }
      else { assert.deepEqual(calls, expected); for (const action of expected) assert.ok(prompt.includes(`${action}:CURRENT_PROVIDER_FACT`)); }
      assert.doesNotMatch(engine.append('先核对条件。'), /CURRENT_PROVIDER_FACT/);
      if (scenario === 'claim-rewards') {
        const retry = gameGuidance(tools, '再帮我领取奖励，重新核对当前状态', () => false);
        await retry.prepare(ctx);
        assert.deepEqual(calls, expected);
        await goalEvidence('再帮我领取奖励，重新核对当前状态', readers, ctx, () => false);
        assert.deepEqual(calls, [...expected, ...expected], 'A new reward request must refresh activity eligibility instead of reusing history');
      }

    }
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: scenario, text: request }), 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  if (scenario === 'claim-rewards-failure') {
    const sent = run.messages.map(message => message.text).join('\n');
    assert.match(sent, /邮件本轮尚未核对清楚/);
    assert.match(sent, /上次领取了灵石 ×11/);
    assert.doesNotMatch(sent, /没有遗漏|灵晶×11/);
    assert.match(sent, /尚未执行领取/);
  } else assert.equal(run.messages.length, 0);
});
