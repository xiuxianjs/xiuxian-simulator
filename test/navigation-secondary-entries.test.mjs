import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/response-apps/more/app.ts'], bundle: true, write: false, platform: 'node', format: 'esm'
});
const { default: menu, MORE_CATEGORIES, parseMoreNavigation } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const rootEntries = MORE_CATEGORIES.filter(category => !category.parent).flatMap(category => category.entries);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const bubbleState = globalThis.__gameNavigationBubble = {
  sent: [], access: { registered: true, moreVisibleCommands: ['/我的权益', '/充值', '/邀请码', '/我的回忆', '/图鉴'], foldVisibleCommands: [] },
  settings: { code: 'OK', data: { dungeonBattleMode: 'auto', teamDungeonNoMental: false, autoApproveFriendTeam: false,
    teamInviteEnabled: true, teamAutoAcceptInvite: 'none', hideProfile: false, confirmSpiritCrystal: 100,
    confirmDaoCrystal: 0, subscription: null } }
};
const bubbleShim = `
const state = globalThis.__gameNavigationBubble;
export default async () => state.settings;
export const selects = [];
export const describeNotificationGroup = async () => [];
export const getBackendRealmAccess = async () => state.access;
export const parseBackendNavigation = value => value;
export const runRobotBusiness = async () => ({ handled: false, data: state.access });
export const emptyRealmAccess = { registered: false, moreVisibleCommands: [], foldVisibleCommands: [] };
export const onResponse = (_, handler) => handler;
export const useEvent = () => [{}, () => {}];
export const useMessage = () => [{ send: message => state.sent.push(message) }];
const markdown = () => ({ parts: [], addText(text) { this.parts.push({ text }); return this; }, addBold(text) { return this.addText(text); },
 addNewline() { return this; }, addButton(label, options) { this.parts.push({ label, command: options.data }); return this; },
 addBlockquote(content) { this.parts.push({ quote: content.parts }); return this; } });
export const Format = { createMarkdown: markdown };
export const FormatGui = value => value;
export const createQuoteMarkdown = (lines, buttons) => { const md = markdown(); for (const line of lines) md.addText(line); for (const button of buttons) md.addButton('[' + button.label + ']', { data: button.command }); return md; };
`;
const rendered = await build({
  stdin: { contents: `export { default as more } from './src/response/more/res.ts'; export { default as settings } from './src/response/message/settings/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'game-navigation-presentation', setup(builder) {
    builder.onResolve({ filter: /^(alemonjs|@src\/)/ }, args => args.path === '@src/response-apps/more/app' ? undefined : { path: args.path, namespace: 'bubble-shim' });
    builder.onLoad({ filter: /.*/, namespace: 'bubble-shim' }, () => ({ contents: bubbleShim }));
  } }]
});
const handlers = await import(`data:text/javascript;base64,${Buffer.from(rendered.outputFiles[0].text).toString('base64')}`);
const renderBubble = async (handler, text) => {
  bubbleState.sent = [];
  await handler({ UserId: 'synthetic-player', uid: 1, MessageText: text, isPrivate: true });
  assert.equal(bubbleState.sent.length, 1);
  return bubbleState.sent[0];
};
const quoteButtons = message => message.content.parts.flatMap(part => part.quote ?? []).filter(part => part.command);

test('actual navigation handlers present named quote blocks and game titles while commands keep catalogue keys', async () => {
  const root = await renderBubble(handlers.more, '/更多');
  assert.equal(root.title, '仙途百事');
  for (const part of root.content.parts.filter(part => part.quote)) {
    assert.match(part.quote[0].label, /^\[.+\]$/);
    assert.ok(part.quote.some(item => item.text && !item.text.startsWith('【')));
    assert.ok(part.quote.some(item => item.command && /^\[.+\]$/.test(item.label)));
  }
  const commercial = await renderBubble(handlers.more, '/更多 权益与充值');
  assert.equal(commercial.title, '仙缘与供奉');
  assert.deepEqual(quoteButtons(commercial).map(button => button.command), ['/我的权益', '/充值', '/邀请码']);
  assert.equal(commercial.header[0].label, '回仙途机缘');
  assert.equal(commercial.header[0].command, '/更多 福利');
  const personal = await renderBubble(handlers.more, '/更多 个人资料');
  assert.equal(personal.title, '道友小传');
  assert.ok(personal.header.some(button => button.label === '藏经阁' && button.command === '/更多 游戏资料'));
  const game = await renderBubble(handlers.more, '/更多 游戏资料');
  assert.equal(game.title, '藏经阁');
  const settings = await renderBubble(handlers.settings, '/我的设置');
  assert.equal(settings.title, '修行设置');
  const quotes = settings.content.parts.filter(part => part.quote);
  assert.equal(quotes.length, 8);
  assert.ok(quotes.every(part => part.quote.some(item => item.text) && part.quote.some(item => item.command)));
  assert.ok(quoteButtons(settings).every(button => /^\[.+\]$/.test(button.label)));
  assert.ok(quoteButtons(settings).some(button => button.command === '/配置秘境模式 手动'));
  const plain = message => `### ${message.title}\n\n` + message.content.parts.map(part => part.quote
    ? part.quote.map(item => item.text ? `> ${item.text}` : `> ${item.label}`).join('\n')
    : part.text ?? '').join('\n\n') + '\n\n' + (message.footer ?? []).map(button => `[${button.label}]`).join(' ') + '\n';
  writeFileSync('/tmp/xiuxian-navigation-game-bubbles.md', [root, commercial, personal, game, settings].map(plain).join('\n'));
});


test('all leaf entrances have service visibility and display names resolve to catalogue keys',()=>{
  const service=new URL('../../xiuxian-game-server/internal/service/',import.meta.url);
  const commands=new Set(['more_navigation.go','fold_navigation.go'].flatMap(file=>[...readFileSync(new URL(file,service),'utf8').split('func ')[0].matchAll(/"(\/[^"\n]+)"/g)].map(match=>match[1])));
  for (const category of MORE_CATEGORIES) {
    for (const entry of category.entries.filter(entry=>!entry.subcategory)) {
      assert.ok(commands.has(entry.visibilityCommand??entry.command), `${entry.command} absent from both service projections`);
    }
    assert.equal(parseMoreNavigation(`/更多 ${category.displayName} 2`).category,category.name);
  }
});


test('talents and public references are discoverable with correct ownership and descriptions', () => {
  const categories = menu(['/我的天赋', '/攻略']).data.categories;
  assert.ok(categories.find(category => category.name === '养成').entries.some(entry => entry.command === '/我的天赋'));
  assert.deepEqual(categories.find(category => category.name === '游戏资料').entries.map(entry => entry.command), ['/攻略']);
  const growth = MORE_CATEGORIES.find(category => category.name === '养成');
  assert.equal(growth.entries.find(entry => entry.command === '/我的职业').description, '炼丹、灵药与锻造');
  assert.equal(growth.entries.find(entry => entry.command === '/我的灵田').label, '灵田');
});


test('every More leaf is registered by the current router without loading business handlers', async () => {
  const registered = new Set();
  globalThis.__moreRegisteredPaths = registered;
  const compiled = await build({entryPoints:['src/router.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'route-registration-only',setup(builder){
    builder.onResolve({filter:/^alemonjs$|^@src\//},args=>({path:args.path,namespace:'routes'}));
    builder.onResolve({filter:/^\.\/api\/bot\/(access-facts|catalog-query-reuse)$|^\.\/utils\/transportTiming$/},args=>({path:args.path,namespace:'routes'}));
    builder.onLoad({filter:/.*/,namespace:'routes'},()=>({contents:`
      const paths=globalThis.__moreRegisteredPaths;
      const group=()=>({group:()=>group(),res:()=>{},use:config=>{for(const entry of Array.isArray(config)?config:[config])paths.add(typeof entry==='string'?entry:entry.path);return [];},define:{}});
      export const Router={create:group};export const withAccessFacts=(_facts,loader)=>loader;export const withCommandCatalog=(_kind,loader)=>loader;export const measureTransportStage=(_name,run)=>run();export default ()=>{};
    `}));
  }}]});
  await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  for (const category of MORE_CATEGORIES) for (const entry of category.entries.filter(entry=>!entry.subcategory)) {
    assert.ok(registered.has(entry.command.slice(1)), `${entry.command} is not a registered entrance`);
  }
  assert.ok(!MORE_CATEGORIES.flatMap(category=>category.entries).some(entry=>['/公告','/游戏公告','/关于游戏'].includes(entry.command)));
  delete globalThis.__moreRegisteredPaths;
});

test('More keeps module entry points and moves reference material to a visibility-filtered child menu', () => {
  assert.equal(rootEntries.length, 41);
  assert.equal(MORE_CATEGORIES.filter(category => !category.parent).length, 8);
  assert.deepEqual(MORE_CATEGORIES.find(category => category.name === '福利').entries.map(entry => entry.label), ['日常活跃', '成就', '活动', '邮件', '礼包码', '仙缘与供奉']);
  assert.ok(!rootEntries.some(entry => entry.command === '/附近道友'));
  const hidden = ['/我的权益', '/充值', '/宗门红包', '/打坐结束', '/出关', '/队伍列表', '/宗门列表', '/飞信 队伍', '/我的上架', '/丹方', '/属性面板', '/周常活跃', '/新人狂欢', '/限时活动', '/新人返利', '/周周返利', '/里程碑', '/我的称号', '/我的回忆', '/我的故事', '/邀请码', '/图鉴', '/天书', '/词典'];
  for (const command of hidden) assert.ok(!rootEntries.some(entry => entry.command === command), command);
  for (const entry of rootEntries) assert.ok(!entry.oneClick);
  const categories = menu(['/我的回忆']).data.categories;
  assert.deepEqual(categories.map(category => category.name), ['设置', '个人资料']);
  assert.deepEqual(categories[0].entries.map(entry => entry.command), ['/更多 个人资料']);
  assert.deepEqual(categories[1].entries.map(entry => entry.command), ['/我的回忆']);
  assert.deepEqual(menu([]).data.categories, []);
  assert.deepEqual(parseMoreNavigation('/更多 资料 2'), { category: '个人资料', page: 2 });
  assert.match(read('src/response/more/res.ts'), /categories\.filter\(item => !item\.parent\)/);
});

test('relocated gameplay operations remain discoverable through their owning module', () => {
  const paths = {
    '/出关': 'src/response/meditation/start/res.ts',
    '/返程': 'src/response/seclusion/info/res.ts',
    '/队伍列表': 'src/response/team/myTeam/res.ts',
    '/宗门列表': 'src/response/guild/myGuild/res.ts',
    '/飞信 队伍': 'src/response/team/myTeam/res.ts',
    '/我的上架': 'src/response/market/command.ts',
    '/丹方': 'src/response/profession/myProfession/res.ts',
    '/属性面板': 'src/response/equipment/myEquipments/res.ts',
    '/周常活跃': 'src/response/activityPoints/daily/res.ts',
    '/新人狂欢': 'src/response/activity/res.ts',
    '/礼包码': 'src/response/activity/res.ts',
    '/黑盒拍卖': 'src/response/activity/res.ts',
    '/新人返利': 'src/response/recharge/info/res.ts',
    '/周周返利': 'src/response/recharge/info/res.ts',
    '/里程碑': 'src/response/monthCard/rights/res.ts',
    '/更多 个人资料': 'src/response/message/settings/res.ts',
    '/更多 游戏资料': 'src/response/message/settings/res.ts',
    '/飞信': 'src/response/friend/friendList/res.ts',
    '/宗门红包': 'src/response/guild/myGuild/view.ts'
  };
  for (const [command, path] of Object.entries(paths)) assert.ok(read(path).includes(command), `${command} missing in ${path}`);
  assert.match(read(paths['/队伍列表']), /footer: \[[\s\S]*?队伍列表/);
  assert.match(read(paths['/宗门列表']), /if \(!data.hasGuild\)[\s\S]*?宗门列表/);
});


test('personal, game, and commercial child menus independently propagate only service-visible leaves', () => {
  const gameOnly = menu(['/图鉴']).data.categories;
  assert.deepEqual(gameOnly.map(category => category.name), ['设置', '游戏资料']);
  assert.deepEqual(gameOnly[0].entries.map(entry => entry.command), ['/更多 游戏资料']);
  assert.deepEqual(gameOnly[1].entries.map(entry => entry.command), ['/图鉴']);
  const inviteOnly = menu(['/邀请码']).data.categories;
  assert.deepEqual(inviteOnly.map(category => category.name), ['福利', '权益与充值']);
  assert.deepEqual(inviteOnly[0].entries.map(entry => entry.command), ['/更多 权益与充值']);
  assert.deepEqual(inviteOnly[1].entries.map(entry => entry.command), ['/邀请码']);
  assert.ok(!inviteOnly.some(category => category.name === '个人资料'));
  for (const command of ['/我的权益', '/充值']) {
    const commercialOnly = menu([command]).data.categories;
    assert.deepEqual(commercialOnly.map(category => category.name), ['福利', '权益与充值']);
    assert.deepEqual(commercialOnly[0].entries.map(entry => entry.command), ['/更多 权益与充值']);
    assert.deepEqual(commercialOnly[1].entries.map(entry => entry.command), [command]);
  }
  assert.match(read('src/response/more/res.ts'), /displayName \?\? category\.parent/);
});

test('nested visibility propagates through additional levels and stops cycles', () => {
  const commercial = MORE_CATEGORIES.find(category => category.name === '权益与充值');
  const originalEntries = [...commercial.entries];
  commercial.entries = [{ label: '邀请', command: '/更多 邀请', description: '', subcategory: '邀请' }];
  MORE_CATEGORIES.push({ name: '邀请', parent: '权益与充值', description: '', entries: [{ label: '邀请奖励', command: '/邀请码', description: '' }] });
  try {
    assert.deepEqual(menu(['/邀请码']).data.categories.map(category => category.name), ['福利', '权益与充值', '邀请']);
    MORE_CATEGORIES.at(-1).entries = [{ label: '循环', command: '/更多 福利', description: '', subcategory: '福利' }];
    assert.deepEqual(menu(['/邀请码']).data.categories, []);
  } finally {
    commercial.entries = originalEntries;
    MORE_CATEGORIES.pop();
  }
});
