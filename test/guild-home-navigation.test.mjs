import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const state = { sent: [], result: null };
globalThis.__guildHomeNavigation = state;
const shim = `
const state = globalThis.__guildHomeNavigation;
const markdown = () => ({ parts: [], addText(text) { this.parts.push({ text }); return this; }, addBold(text) { return this.addText(text); }, addNewline() { return this; }, addBlockquote(content) { this.parts.push({ quote: content.parts }); return this; }, addButton(label, options) { this.parts.push({ label, command: options.data }); return this; } });
export const Format = { createMarkdown: markdown };
export const logger = { error: (...args) => { throw new Error(args.join(' ')); } };
export const onResponse = (_selects, fn) => fn;
export const selects = [];
export const useMessage = () => [{ send: value => { state.sent.push(value); } }];
export const FormatGui = value => value;
export const createQuoteMarkdown = (lines, buttons = []) => { const md = markdown(); for (const line of lines) md.addText(line); for (const button of buttons) md.addButton(button.label, {data: button.command}); return md; };
export const formatGuildShopAutoRefreshHours = hours => hours.join('/');
`;
const mocks = new Set(['alemonjs', '@src/utils/useMessage', '@src/response/config', '@src/utils/messageHelper', '@src/response-apps/guild/autoRefreshShop/view', '@src/response-apps/guild/myGuild/app', '@src/response-apps/guild/memberList/app']);
const bundle = await build({
  stdin: { contents: `export { default as home } from './src/response/guild/myGuild/res.ts'; export * from './src/response/guild/myGuild/view.ts'; export { default as members } from './src/response/guild/memberList/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'guild-home-navigation', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocks.has(args.path) ? { path: args.path.endsWith('/app') ? 'app' : 'shim', namespace: 'guild-home-test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'guild-home-test' }, args => ({ contents: args.path === 'app' ? 'export default async () => globalThis.__guildHomeNavigation.result;' : shim, loader: 'js' }));
  } }]
});
const { home, members, buildGuildHomePage } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const data = {
  hasGuild: true, access: { canCreateOrApplyGuild: true },
  membership: { guildId: 1, guildName: '青云门', roleName: '弟子', isDeputy: false, canUpgrade: false, isLeader: false },
  guild: { level: 3, leader: { userId: 2, name: '宗主' }, spiritStone: 10, spiritStoneCap: 100, prestige: 5, prestigeCap: 100, veinLevel: 1, shopLevel: 1, viceLeaderCount: 1, viceLeaderLimit: 2, elderCount: 1, elderLimit: 2, memberCount: 3, memberCapacity: 20, minRealmName: '筑基', notice: '一起修炼', titles: [], shopAutoRefresh: { enabled: false, hours: [] } },
  unlockLevels: { shop: 2, viceLeader: 2, elder: 2 }, pendingApplications: 3,
  storyline: { initialized: true, allCleared: false, stageIndex: 2 }
};
const commands = page => {
  const parts = part => [part.command, ...(part.quote ?? []).flatMap(parts)].filter(Boolean);
  return [...(page.header ?? []).map(button => button.command).filter(Boolean), ...page.content.parts.flatMap(parts), ...(page.footer ?? []).map(button => button.command)];
};
const event = text => ({ UserId: 'one', uid: 1, isPrivate: true, MessageText: text });
const render = async (handler, text) => { state.sent = []; await handler(event(text)); assert.equal(state.sent.length, 1); return state.sent[0]; };

test('ordinary members have grouped daily and activity navigation without privileged actions', async () => {
  state.result = { code: 'OK', data };
  const page = await render(home, '/我的宗门');
  assert.equal(page.title, undefined);
  assert.match(JSON.stringify(page.content), /【青云门】 3级\(ID:1\)/);
  assert.match(JSON.stringify(page.content), /灵石：10\/100/);
  assert.match(JSON.stringify(page.content), /声望：5\/100/);
  assert.doesNotMatch(JSON.stringify(page.content), /【宗门底蕴】|【宗门修行】|【宗门文告】/);
  assert.match(JSON.stringify(page.content), /主线战况：第2关/);
  assert.equal(page.header, undefined);
  for (const command of ['/宗门日常', '/宗门周常', '/宗门商店', '/宗门战备', '/宗门主线', '/宗门成员列表', '/我的宗门 活动', '/我的宗门 资料', '/飞信 宗门']) {
    assert.ok(commands(page).includes(command), command);
  }
  assert.ok(!commands(page).includes('/提升宗门等级'));
  assert.ok(!commands(page).includes('/宗门审核'));
  assert.equal(commands(page).length, new Set(commands(page)).size);
  assert.deepEqual(commands(await render(home, '/查看势力')), commands(page));
  assert.deepEqual(commands(await render(home, '/我的宗门 管理')), ['/我的宗门', '/我的宗门 活动', '/我的宗门 资料', '/我的宗门']);
  const activity = await render(home, '/我的宗门 活动');
  assert.equal(activity.title, '【青云门】宗门演武');
  assert.doesNotMatch(JSON.stringify(activity), /按活动页面|参与条件操作|组织活动与交流/);
  for (const command of ['/宗门主线', '/宗门大比', '/灵脉攻防战', '/宗门红包', '/宗门精华']) {
    assert.ok(commands(activity).includes(command), command);
  }
});

test('leadership, elders and deputies receive only the management groups their existing facts permit', () => {
  const member = membership => ({ ...data, membership: { ...data.membership, ...membership } });
  const leader = commands(buildGuildHomePage(member({ roleName: '宗主', isLeader: true, canUpgrade: true }), '管理'));
  for (const command of ['/宗门审核', '/踢出成员', '/宗门改职', '/提升宗门等级', '/设置宗门简介', '/宗门改名', '/宗主转让', '/解散宗门']) { assert.ok(leader.includes(command), command); }
  const elder = commands(buildGuildHomePage(member({ roleName: '长老' }), '管理'));
  assert.ok(elder.includes('/宗门审核'));
  assert.ok(elder.includes('/踢出成员'));
  assert.ok(elder.includes('/卸任'));
  for (const command of ['/宗门改职', '/提升宗门等级', '/设置宗门简介', '/宗门改名', '/宗主转让', '/解散宗门']) { assert.ok(!elder.includes(command), command); }
  const deputy = commands(buildGuildHomePage(member({ isDeputy: true, canUpgrade: true }), '管理'));
  assert.ok(deputy.includes('/宗门改职'));
  assert.ok(deputy.includes('/设置申请宗门最低境界'));
  for (const command of ['/宗门改名', '/宗主转让', '/宗主请假', '/解散宗门']) { assert.ok(!deputy.includes(command), command); }
});

test('sect chronicles and deliberations use named quote blocks with existing facts and local actions', () => {
  const leaderData = { ...data, membership: { ...data.membership, roleName: '宗主', isLeader: true, canUpgrade: true } };
  const council = buildGuildHomePage(leaderData, '管理');
  assert.equal(council.title, '【青云门】宗门议事');
  assert.deepEqual(council.header.at(-1), { label: '议事' });
  assert.doesNotMatch(JSON.stringify(council.content), /青云门/);
  assert.doesNotMatch(JSON.stringify(council), /操作页面确认|原有确认|组织活动|现有规则/);
  const councilQuotes = council.content.parts.filter(part => part.quote).map(part => part.quote);
  const construction = councilQuotes.find(parts => parts.some(part => part.text?.includes('灵石：10/100')));
  assert.ok(construction.some(part => part.text?.includes('灵石：10/100')));
  assert.ok(construction.some(part => part.command === '/提升宗门等级'));
  const chronicle = buildGuildHomePage(data, '资料');
  assert.equal(chronicle.title, '【青云门】宗门志');
  for (const part of chronicle.content.parts.filter(part => part.quote)) {
    assert.doesNotMatch(part.quote[0].text, /^【.+】$/);
  }
});

test('no-guild states only show joining choices and respect creation eligibility', async () => {
  for (const eligible of [false, true]) {
    state.result = { code: 'NO_GUILD', data: { canCreateOrApplyGuild: eligible } };
    assert.deepEqual(commands(await render(home, '/我的宗门 管理')), ['/宗门列表', '/我的申请', ...(eligible ? ['/创建宗门'] : [])]);
  }
});

test('member directory keeps social actions and does not advertise privileged mutations without permission facts', async () => {
  state.result = { code: 'OK', data: { guildName: '青云门', members: [{ userId: 2, roleName: '宗主', userName: '宗主', dailyActivity: 1, weeklyActivity: 2 }], page: 1, totalPages: 1, total: 1 } };
  assert.deepEqual(commands(await render(members, '/宗门成员列表')), ['/查看信息 2', '/发飞信 2 ', '/我的宗门', '/飞信 宗门']);
});
