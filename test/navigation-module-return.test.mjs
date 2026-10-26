import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

import { joinMarkdownParts, renderMarkdownBlockquote } from 'alemonjs/markdown';

const state = globalThis.__moduleReturnNavigation = { sent: [], result: null };
const framework = createPresentationHarness(state);
const apps = new Set(['team/myTeam', 'team/teamList', 'team/myApplications', 'team/applications', 'shop/playerShop/list'].map(path => `@src/response-apps/${path}/app`));
const bundle = await build({
  stdin: { contents: `export {default as team} from './src/response/team/myTeam/res.ts';export {default as teams} from './src/response/team/teamList/res.ts';export {default as applications} from './src/response/team/myApplications/res.ts';export {default as review} from './src/response/team/applications/res.ts';export {default as shops} from './src/response/shop/playerShop/list/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'module-return-seams', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /.*/ }, args => apps.has(args.path) || args.path.startsWith('@src/api/bot/') || ['@src/utils/useMessage', '@src/response/config', '@src/response/robotBusiness'].includes(args.path) ? { path: args.path, namespace: 'seam' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `const s=globalThis.__moduleReturnNavigation;export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';// Navigation tests provide the decoded view model; HTTP decoding has separate contract tests.
export const runRobotBusiness=async(_event,operation)=>({handled:false,data:operation==='player-shop.list'?s.result.data:s.result});
export const parseBackendTeamInfo=()=>{};export const parseBackendTeams=()=>{};export const parseBackendTeamWorkflow=()=>{};export const parseBackendTeamPendingApplications=()=>{};export const parseBackendShopList=()=>{};
export default async()=>s.result;` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => node.type === 'MD.blockquote' ? flatten(node.value) : [node]);
const nodes = payload => payload.filter(part => part.type === 'Markdown').flatMap(part => part.value);
const commands = payload => flatten(nodes(payload)).filter(node => node.type === 'MD.button').map(node => node.options.data);
const text = list => joinMarkdownParts(list, list.map(node => node.type === 'MD.blockquote' ? renderMarkdownBlockquote(node.value, text) : node.type === 'MD.newline' ? '\n' : node.type === 'MD.bold' ? `**${node.value}**` : String(node.value ?? '')));
const samples = [];
async function render(name, command, result) {
  state.sent = []; state.result = result;
  const event={name:'message.create',UserId:'fixture',uid:7,isPrivate:true,MessageText:command};
  await framework.run(handlers[name], event, ()=>{});
  assert.equal(state.sent.length, 1);
  samples.push({ name: command + ' · ' + result.code, payload: state.sent[0] });
  return commands(state.sent[0]);
}

test('no-team state reaches applications and invites; member state retains only service-authorized actions', async () => {
  assert.deepEqual(await render('team', '/我的队伍', { code: 'NO_TEAM' }), ['/创建队伍', '/队伍列表', '/我的队伍申请', '/我的队伍邀请', '/更多 社交']);
  const actions = { canInvite: false, canManageMembers: false, canReviewApplications: false, canUseTeamMail: true, canViewDungeon: true, canDisband: false, canLeave: true };
  const data = { leaderName: '青云', members: [], actions };
  const member = await render('team', '/我的队伍', { code: 'OK', data });
  assert.deepEqual(member, ['/飞信 队伍', '/查看秘境', '/离开队伍', '/更多 社交']);
  const leader = await render('team', '/我的队伍', { code: 'OK', data: { ...data, actions: { ...actions, canReviewApplications: true, canDisband: true } } });
  assert.ok(leader.includes('/我的队伍申请'));
  assert.ok(leader.includes('/解散队伍'));
  assert.ok(!member.includes('/我的队伍申请'));
});

test('team list and both application roles retain return paths even when empty', async () => {
  for (const teams of [[], [{ teamId: 1, leaderName: '青云', memberCount: 1, maxMembers: 4, minRealmName: null }]]) {
    const buttons = await render('teams', '/队伍列表', { code: 'OK', data: { teams, currentPage: 1, totalPages: 1 } });
    for (const command of ['/我的队伍', '/我的队伍申请', '/我的队伍邀请']) assert.ok(buttons.includes(command));
  }
  for (const role of ['LEADER', 'MEMBER']) {
    for (const applications of [[], [{ id: 12, userId: 9, userName: '道友', leaderName: '青云', createdAt: '刚刚' }]]) {
      const buttons = await render('applications', '/我的队伍申请', { code: role, data: { leaderName: '青云', applications } });
      assert.ok(buttons.includes('/我的队伍'));
      if (role === 'MEMBER') assert.ok(buttons.includes('/我的队伍邀请'));
      else assert.ok(!buttons.includes('/我的队伍邀请'));
      if (applications.length) assert.ok(buttons.includes(role === 'LEADER' ? '/队伍同意 12' : '/取消队伍申请 12'));
    }
  }
  for (const applications of [[], [{ id: 12, userId: 9, userName: '道友' }]]) {
    const buttons = await render('review', '/队伍申请', { code: 'OK', data: { leaderName: '青云', applications } });
    assert.ok(buttons.includes('/我的队伍'));
  }
});

test('empty and populated shop lists keep a single personal-shop entrance and return to their category', async () => {
  for (const shops of [[], [{ userId: 9, shopName: '青云小店', ownerName: '青云', level: 1, levelName: '小店', heatScore: 2, activeListings: 1, totalSales: 0 }]]) {
    const buttons = await render('shops', '/小店', { code: 'OK', data: { data: shops, pagination: { currentPage: 1, totalPages: 1, total: shops.length } } });
    assert.equal(buttons.filter(command => command === '/我的小店').length, 1);
    assert.ok(buttons.includes('/更多 交易'));
    if (shops.length) assert.ok(buttons.includes('/逛店 9'));
  }
  writeFileSync('/tmp/xiuxian-module-return-panels.md', samples.map(sample => `## ${sample.name}\n\n${text(nodes(sample.payload))}\n\n[我] [战] [本] [动] [店]\n`).join('\n'));
});
