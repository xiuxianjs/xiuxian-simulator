import assert from 'node:assert/strict';
import { bubbleSemantics } from './bubble-semantics.mjs';

// These existing Go matrices contain exactly one unsafe-number example per
// handler; all other original rows keep their full request and receipt checks.
export const unsafeCaveFixture = row => /\b100000000000000000000\b/.test(row.text);
export function assertCaveInputRefusal(state, messages) {
 assert.equal(state.calls,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(messages.length,1);
 const view=bubbleSemantics(messages);assert.ok(view.text.includes('灵田参数格式错误'));assert.ok(view.commands.includes('/灵田'));
 assert.ok(!view.commands.some(command=>/^\/(开垦|播种|浇灌|除虫|除草|收割|升级灵田|灵田加速)(?:\s|$)/.test(command)));
}
