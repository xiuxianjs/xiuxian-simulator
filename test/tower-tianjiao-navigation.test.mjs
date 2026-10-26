import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const state = { sent: [], reads: [], visible: true, failTianjiao: false, failTower: false };
globalThis.__towerTianjiaoNavigationTest = state;
const shim = `
const state = globalThis.__towerTianjiaoNavigationTest;
const markdown = () => ({ parts: [], addText(text) { this.parts.push({ text }); return this; },
  addNewline() { return this; }, addBlockquote(md) { this.parts.push({ quote: md.parts }); return this; },
  addButton(label, options) { this.parts.push({ label, command: options.data }); return this; } });
export const Format = { createMarkdown: markdown };
export const onResponse = (_selects, handler) => handler;
export const selects = [];
export const useMessage = () => [{ send: value => state.sent.push(value) }];
export const FormatGui = value => value;
export const addOptions = (md, buttons) => { for (const button of buttons) md.addButton(button.label, { data: button.command }); };
export class BackendAPIError extends Error {}
export const getBackendTongtianTower = async () => { state.reads.push('tower'); if (state.failTower) throw new Error('通天塔读取失败'); return state.tower; };
export const getBackendTianjiaoLeaderboard = async () => { state.reads.push('tianjiao'); if (state.failTianjiao) throw new Error('optional read failed'); return { isVisible: state.visible, canChallenge: false }; };
`;
const mocked = new Set(['alemonjs', '@src/utils/useMessage', '@src/response/config', '@src/utils/messageHelper', '@src/api/bot/client', '@src/api/bot/tongtian-tower', '@src/api/bot/tianjiao-leaderboard-queries']);
const result = await build({
  stdin: { contents: `export { default } from './src/response/ranking/viewRankings/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'tower-navigation-harness', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocked.has(args.path) ? { path: 'shim', namespace: 'tower-test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'tower-test' }, () => ({ contents: shim, loader: 'js' }));
  } }]
});
const tower = (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;
const event = { UserId: 'player', uid: 9, isPrivate: false, MessageText: '/通天塔' };
const reset = () => {
  state.sent.length = 0; state.reads.length = 0; state.visible = true; state.failTianjiao = false; state.failTower = false;
  state.tower = { isOpen: true, top3: [], nearby: [], myRank: 20, challengeCost: 10, challengeTip: '挑战提示', rewardTip: '奖励提示' };
};
const hasEntry = () => state.sent[0].footer.some(button => button.command === '/登天梯');

test('visible preview entry remains reachable even when challenge eligibility is false', async () => {
  reset(); await tower(event);
  assert.ok(hasEntry());
  assert.deepEqual(state.reads, ['tower', 'tianjiao']);
  assert.ok(state.sent[0].content.parts.some(part => part.text === '暂无排名信息'));
  assert.deepEqual(state.sent[0].footer.map(button => button.command), ['/登天梯', '/连续爬塔', '/月度排名奖励', '/扫荡排名']);
});

test('invisible tianjiao does not expose a preview entry', async () => {
  reset(); state.visible = false; await tower(event);
  assert.ok(!hasEntry());
  assert.deepEqual(state.sent[0].footer.map(button => button.command), ['/连续爬塔', '/月度排名奖励', '/扫荡排名']);
});

test('optional tianjiao read failure leaves the exact tower presentation intact', async () => {
  reset(); state.visible = false; await tower(event);
  const expected = JSON.stringify(state.sent[0]);
  reset(); state.failTianjiao = true; await tower(event);
  assert.equal(JSON.stringify(state.sent[0]), expected);
});

test('closed or failed tower preserves its original message and tianjiao entry', async () => {
  reset(); state.tower.isOpen = false; state.tower.message = '本月通天塔暂未开放'; await tower(event);
  assert.ok(hasEntry());
  assert.deepEqual(state.sent[0].content.parts, [{ text: '本月通天塔暂未开放' }]);
  reset(); state.failTower = true; await tower(event);
  assert.ok(hasEntry());
  assert.deepEqual(state.sent[0].content.parts, [{ text: '通天塔读取失败' }]);
});

test('unmatched commands perform neither tower nor tianjiao reads', async () => {
  reset(); await tower({ ...event, MessageText: '/未知' });
  assert.deepEqual(state.reads, []);
  assert.deepEqual(state.sent, []);
});
