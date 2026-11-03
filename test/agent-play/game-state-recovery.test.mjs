import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGuidance, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { declareFreshObservation, bindExecutionPolicies } from '../../src/expose/execution-policy.ts';

const empty = { type: 'object', properties: {}, additionalProperties: false };
const status = { type: 'object', properties: { protocol: { type: 'string' }, flow: { type: 'string' }, accountExists: { type: 'boolean' } }, required: ['protocol', 'flow', 'accountExists'], additionalProperties: false };
for (const failure of ['transport', 'invalid-contract']) test(`failed tutorial lookup leaves business validation in charge: ${failure}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  let healthy = false, businessReady = false, mutations = 0, observations = 0;
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `state-${failure}`, messageId: 'recovery', text: '开始闭关' });
  const run = await app.runHandler(async () => {
    const observation = Expose.action({ description: 'fresh observation', effect: 'write', inputSchema: empty, outputSchema: empty, handler: () => { observations++; return {}; } });
    declareFreshObservation(observation.handler);
    const config = { name: 'xiuxian.player.v1', description: 'state recovery fixture', actions: {
      get_guidance_state: Expose.action({ description: 'state', effect: 'read', inputSchema: empty, outputSchema: status, handler: () => {
        if (!healthy && failure === 'transport') throw new Error('fixture state unavailable');
        return { protocol: healthy ? 'plugin-guidance.v1' : 'unknown.v9', flow: 'gameplay', accountExists: true };
      } }),
      observe_inventory: observation,
      start_meditation: Expose.action({ description: 'begin', effect: 'write', inputSchema: empty, outputSchema: empty, handler: () => { if (!businessReady) throw new Error('business eligibility rejected'); mutations++; return {}; } })
    } };
    registerExpose('xiuxian-game', [config]);
    bindExecutionPolicies([config]);
    // A cached successful identity must not cover this turn's failed query.
    rememberGuidance({ protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true });
    const call = args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
    const tools = [{ name: 'expose_read', execute: call }, { name: 'expose_write', execute: call }];
    gameGuidance(tools, event.MessageText);
    const invoke = (action, read = false) => tools[read ? 0 : 1].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: '{}' }, { signal: new AbortController().signal });
    await invoke('get_guidance_state', true);
    assert.equal((await invoke('start_meditation')).ok, false, 'business still rejects its own unmet conditions');
    assert.equal(mutations, 0);
    assert.equal((await invoke('observe_inventory')).ok, true, 'fresh observations remain available for recovery');
    businessReady = true;
    healthy = true;
    assert.equal((await invoke('get_guidance_state', true)).ok, true);
    assert.equal((await invoke('start_meditation')).ok, true);
    assert.equal(mutations, 1);
    healthy = false;
    await invoke('get_guidance_state', true);
    assert.equal((await invoke('start_meditation')).ok, true, 'unavailable tutorial state cannot lock a valid unrelated business');
    assert.equal(mutations, 2);
    assert.equal(observations, 1);
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
});
