import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'esbuild';

const state = { access: {}, sent: [], checkins: [], checkinCalls: 0 };
globalThis.__navigationSimplificationTest = state;
const shim = `
const state = globalThis.__navigationSimplificationTest;
const markdown = () => ({ parts: [],
  addText(text) { this.parts.push({ text }); return this; },
  addBold(text) { return this.addText(text); },
  addNewline() { return this; },
  addBlockquote(content) { this.parts.push({ quote: content.parts }); return this; },
  addButton(label, options) { this.parts.push({ label, command: options.data }); return this; }
});
export const Format = { createMarkdown: markdown };
export const logger = { error: (...args) => { throw new Error(args.join(" ")); } };
export const addOptions = (md, buttons) => { for (const button of buttons) md.addButton(button.label, { data: button.command }); return md; };
export const onResponse = (_selects, fn) => fn;
export const selects = [];
export const useEvent = () => [{}, () => { throw new Error('unexpected parent next'); }];
export const getRobotHomeOverview = async () => ({success:true,branch:'business',middleware:{identity:{account:{playerId:1}},replies:[],contextWarnings:[]},data:{}});
export const sendMiddlewareReply = () => { throw new Error('unexpected middleware reply'); };
export default () => true;
export const useMessage = () => [{ send: value => { state.sent.push(value); } }];
export const getBackendRealmAccess = async () => state.access;
export const emptyRealmAccess = { registered: false, moreVisibleCommands: [], foldVisibleCommands: [] };
export const FormatGui = value => value;
export const createQuoteMarkdown = (lines, buttons) => { const md = markdown(); for (const text of lines) md.addText(text); for (const button of buttons) md.addButton(button.label, { data: button.command }); return md; };
export const createBackendRequestContext = () => ({ requestId: 'checkin', idempotencyKey: 'checkin' });
export const executeBackendCaveCommand = async (_bid, _uid, input, context) => { (state.caveCalls ??= []).push({input, context}); return { message: '完成', overview: { plots: [] } }; };
export const sendCaveCommandFallback = () => { throw new Error('unexpected cave fallback'); };
export const getBackendCaveAccelerationPreview = async () => { throw new Error('unexpected acceleration'); };
export const presentBackendCavePlots = plots => plots;
export const postBackendCheckInHub = async () => { state.checkinCalls++; return state.checkins; };
`;
const mocked = new Set(['@src/api/bot/robot-business', '@src/response/mwBan', '@src/response/mwFeatureTrack', '@src/response/middlewareReply', 'alemonjs', '@src/utils/useMessage', '@src/api/bot/realm-access-queries', '@src/response/config', '@src/utils/messageHelper', '@src/api/bot/context', '@src/api/bot/checkin-hub', '@src/response-apps/message/me/app', '@src/api/bot/cave-command', '@src/api/bot/cave-plot-actions', '@src/response/cavePlot/info/res']);
const result = await build({
  stdin: { contents: `export { default as more } from './src/response/more/res.ts'; export { default as help } from './src/response/help.ts'; export { default as checkin } from './src/response/signIn/hub/res.ts'; export { default as home } from './src/response/message/me/res.ts'; export * from './src/response-apps/more/app.ts'; export { default as caveAction } from './src/response/cavePlot/action/res.ts'; export { sendSelfCavePlotPage } from './src/response/cavePlot/render.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'presentation-harness', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocked.has(args.path) ? { path: args.path === '@src/response-apps/message/me/app' ? 'home-app' : 'shim', namespace: 'navigation-test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'navigation-test' }, args => ({ contents: args.path === 'home-app' ? 'export default () => globalThis.__navigationSimplificationTest.home;' : shim, loader: 'js' }));
  } }]
});
const { more, help, checkin, home, MORE_CATEGORIES, sendSelfCavePlotPage, caveAction } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const event = text => ({ UserId: 'player', uid: 1, isPrivate: true, MessageText: text });
const render = async (handler, text) => { state.sent = []; await handler(event(text)); assert.equal(state.sent.length, 1); return state.sent[0]; };
const access = commands => ({ registered: true, moreVisibleCommands: commands, foldVisibleCommands: [] });
const allCommands = MORE_CATEGORIES.flatMap(category => category.entries.map(entry => entry.visibilityCommand ?? entry.command));
const bodyButtons = message => message.content.parts.flatMap(part => part.quote ?? [part]).filter(part => part.command);

test('root shows categories instead of command lists; only service-visible categories appear', async () => {
  state.access = access(allCommands);
  const root = await render(more, '/更多');
  assert.equal(bodyButtons(root).length, 8);
  assert.deepEqual(root.header, [{label:'安全中心',command:'/安全中心'},{label:'我的设置',command:'/我的设置'},{label:'登录',command:'/登录'}]);
  for (const button of bodyButtons(root)) assert.match(button.command, /^\/更多 /);
  state.access = access(['/我的功法']);
  assert.deepEqual(bodyButtons(await render(more, '/更多')).map(button => button.command), ['/更多 养成']);
  assert.deepEqual(bodyButtons(await render(more, '/更多 修炼')).map(button => button.command), ['/更多 养成']);
});

test('registered visibility combines both existing projections; guests cannot gain fold-only actions', async () => {
  state.access = { registered: true, moreVisibleCommands: [], foldVisibleCommands: ['/我的境界'] };
  assert.deepEqual(bodyButtons(await render(more, '/更多 修炼')).map(button => button.command), ['/我的境界']);
  state.access = { registered: false, moreVisibleCommands: ['/图鉴'], foldVisibleCommands: ['/我的境界'] };
  assert.deepEqual(bodyButtons(await render(more, '/更多')).map(button => button.command), ['/更多 设置']);
});

test('category pagination is bounded, has no duplicate entries, and old aliases use the same menu', async () => {
  state.access = access(allCommands);
  const first = await render(more, '/更多 挑战');
  const second = await render(more, '/更多 挑战 999');
  assert.equal(first.content.parts.filter(part => part.quote).length, 6);
  assert.equal(second.nav.current, second.nav.total);
  const seen = new Set();
  for (let page = 1; page <= second.nav.total; page++) {
    for (const button of bodyButtons(await render(more, `/更多 挑战 ${page}`))) {
      assert.ok(!seen.has(button.command));
      seen.add(button.command);
    }
  }
  assert.equal(seen.size, MORE_CATEGORIES.find(category => category.name === '挑战').entries.length);
  assert.equal(second.nav.command, '/更多 挑战 {page}');
  const alias = await render(more, '/折叠 2');
  assert.equal(bodyButtons(alias).length, 8);
});

test('default help offers a short actionable path; stage guides remain available', async () => {
  state.access = access(allCommands);
  const summary = await render(help, '/帮助');
  assert.equal(summary.title, '修仙帮助');
  assert.equal(summary.header.length + summary.footer.flat().length, 9);
  assert.equal((await render(help, '/帮助 1')).title, '萌新帮助 · 第一阶段');
  state.access = { registered: false, moreVisibleCommands: [], foldVisibleCommands: [] };
  const guest = await render(help, '/帮助');
  assert.equal(guest.header.length, 0);
  assert.equal(guest.footer.flat()[0].command, '/踏入仙途');
});

test('unified checkin preserves one settlement request and exposes retries only for failed subcommands', async () => {
  state.checkinCalls = 0;
  state.checkins = [{ name: '日常签到', status: 'done', message: '已领取' }, { name: '新人签到', status: 'skip', message: '不适用' }];
  const done = await render(checkin, '/签到');
  assert.equal(state.checkinCalls, 1);
  assert.equal(done.footer.flat().length, 2);
  state.checkins.push({ name: '宗门签到', status: 'error', message: '暂时失败' });
  assert.equal((await render(checkin, '/签到')).footer.flat()[0].command, '/宗门签到');
  assert.equal(state.checkinCalls, 2);
});

test('retired exploration routes are absent and fold routes share the More implementation', () => {
  const router = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(router, /res-end|探索灵矿|探索怪物|修仙地图|featureFold/);
  assert.match(router, /\['折叠', '扩展'\],[\s\S]*?import\('@src\/response\/more\/res'\)/);
});


test('home keeps growth shortcuts bounded while actionable notifications remain visible', async () => {
  const resource = { current: 1, cap: 2, recoverText: '' };
  state.home = { code: 'OK', data: {
    notifications: [{ type: 'PENDING_TEAM', count: 1 }], atmosphere: { text: null, kind: 'none' },
    profile: { uid: 1, name: '测试道友', title: '无', genderText: '男', nextGenderText: '女', signature: '' },
    stats: { combatPower: 100, realmName: '炼气', experienceText: '1/2', qi: resource, mental: resource },
    actions: { isEarlyStarter: false, isNewcomer: false, socialTargetUid: 1, renameValue: '测试', canUseFifthLayerFeature: true, canUseSecondLayerFeature: true, canUseProfessionAndCave: true }
  } };
  const page = await render(home, '/我');
  assert.deepEqual(page.footer.map(row => row.map(button => button.label)), [['宗门','洞府','师门','道侣'],['背包','组队','帮助','更多']]);
  assert.deepEqual(page.footer.flat().map(button => button.command), ['/我的宗门','/我的洞府','/我的师门','/我的道侣','/储物袋','/我的队伍','/帮助','/更多']);
  assert.ok(bodyButtons(page).some(button => button.command === '/队伍申请'));
  assert.ok(!page.header.some(button => /返利/.test(button.command)));
  state.home.data.actions.isNewcomer = true;
  assert.equal((await render(home, '/我')).header.at(-1).command, '/新人狂欢');
});


test('cave operations expose every service-provided action, including unlockable plots', () => {
  state.sent = [];
  const actions = ['升级', '浇灌', '除虫', '除草', '加速'].map(label => ({ label, command: `/${label} 1` }));
  sendSelfCavePlotPage({ title: '灵田', bid: 'player', isPrivate: true, showOperations: true, message: { send: page => state.sent.push(page) }, plots: [
    { plotIndex: 1, title: '已种植', actions },
    { plotIndex: 2, title: '待开垦', status: 'unlockable', actions: [{ label: '开垦', command: '/开垦 2' }] }
  ] });
  const page = state.sent[0];
  assert.equal(page.title, '灵田操作');
  assert.deepEqual(bodyButtons(page).map(button => button.command), [...actions.map(action => action.command), '/开垦 2']);
  assert.equal(page.footer[0].command, '/我的灵田');
});


test('one-click cave aliases settle all eligible plots using the existing single idempotent command', async () => {
  state.caveCalls = [];
  const cases = [ ['/一键收割', {action: 'harvest', plotIndex: undefined}], ['/一键浇灌', {action: 'care', careAction: 'water', plotIndex: undefined}], ['/一键除虫', {action: 'care', careAction: 'worm', plotIndex: undefined}], ['/一键除草', {action: 'care', careAction: 'weed', plotIndex: undefined}] ];
  for (const [command, expected] of cases) {
    const before = state.caveCalls.length;
    await render(caveAction, command);
    assert.equal(state.caveCalls.length, before + 1);
    assert.deepEqual(state.caveCalls.at(-1).input, expected);
    assert.equal(state.caveCalls.at(-1).context.idempotencyKey, 'checkin');
  }
});

test('category rows expose module entrances while one-click actions stay inside modules', async () => {
  state.access = access(['/我的功法', '/我的装备']);
  const commands = bodyButtons(await render(more, '/更多 养成')).map(button => button.command);
  assert.deepEqual(commands, ['/我的功法', '/我的装备']);
  assert.ok(!commands.some(command => /确认|分解|洗涤/.test(command)));
});
