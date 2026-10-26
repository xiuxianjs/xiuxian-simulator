import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { build } from 'esbuild';
import { joinMarkdownParts, renderMarkdownBlockquote } from 'alemonjs/markdown';

const state = globalThis.__nativeNavigationPanel = {
  sent: [], access: { registered: true, moreVisibleCommands: [], foldVisibleCommands: [] },
  settings: { code: 'OK', data: { dungeonBattleMode: 'auto', teamDungeonNoMental: false, autoApproveFriendTeam: false,
    teamInviteEnabled: true, teamAutoAcceptInvite: 'none', hideProfile: false, confirmSpiritCrystal: 100,
    confirmDaoCrystal: 0, subscription: null } }
};
const framework = createPresentationHarness(state);
const seam = `const state=globalThis.__nativeNavigationPanel;
export default async()=>state.settings;
export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
export const createBackendRequestContext=()=>({});
export const getViewCodeData=async()=>({code:'OK',referralCode:'SAMPLE',inviteCount:2,inviteLimit:null,pendingRewards:1});
export const getBackendRealmAccess=async()=>state.access;
export const emptyRealmAccess={registered:false,moreVisibleCommands:[],foldVisibleCommands:[]};
export const describeNotificationGroup=async()=>[];
export const runRobotBusiness=async(_event,operation)=>({handled:false,data:operation==='navigation.more'?state.access:{referralCode:'SAMPLE',inviteCount:2,inviteLimit:null,pendingRewards:1}});
export { useMessage } from 'alemonjs';`;
const mocked = new Set(['@src/response/robotBusiness', '@src/utils/useMessage', '@src/api/bot/realm-access-queries', '@src/response/config', '@src/notification/channel', '@src/response-apps/message/settings/app','@src/response-apps/referral/viewCode/app','@src/api/bot/context']);
const result = await build({
  stdin: { contents: `export {default as more} from './src/response/more/res.ts';export {default as settings} from './src/response/message/settings/res.ts';export {default as invite} from './src/response/referral/viewCode/res.ts';export {MORE_CATEGORIES} from './src/response-apps/more/app.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'native-format-business-seams', setup(builder) {
    builder.onResolve({filter: /^alemonjs$/}, () => ({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    builder.onResolve({filter: /.*/}, args => mocked.has(args.path) ? {path:args.path,namespace:'seam'} : undefined);
    builder.onLoad({filter: /.*/,namespace:'seam'}, () => ({contents:seam}));
  }}]
});
const {more,settings,invite,MORE_CATEGORIES}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const allCommands=MORE_CATEGORIES.flatMap(category=>category.entries.filter(entry=>!entry.subcategory).map(entry=>entry.visibilityCommand??entry.command));
const render=async(handler,text)=>{
  state.sent=[];
  const event={name:'message.create',UserId:'synthetic-player',uid:1,MessageText:text,isPrivate:true};
  await framework.run(handler, event, ()=>{});
  assert.equal(state.sent.length,1);
  return state.sent[0];
};
const md=payload=>payload.find(part=>part.type==='Markdown').value;
const buttons=nodes=>nodes.flatMap(node=>node.type==='MD.blockquote'?buttons(node.value):node.type==='MD.button'?[node]:[]);
const defaultBar=payload=>payload.find(part=>part.type==='BT.group').value.flatMap(row=>row.value).slice(-5);
const renderNodes=nodes=>joinMarkdownParts(nodes,nodes.map(node=>{
  if(node.type==='MD.blockquote')return renderMarkdownBlockquote(node.value,renderNodes);
  if(node.type==='MD.newline')return '\n';
  if(node.type==='MD.bold')return `**${node.value}**`;
  return String(node.value??'');
}));
const panelText=payload=>renderNodes(md(payload))+'\n\n'+defaultBar(payload).map(button=>`[${button.value}]`).join(' ')+'\n';

function assertPanel(payload) {
  assert.deepEqual(payload.map(part=>part.type),['Markdown','BT.group']);
  assert.deepEqual(defaultBar(payload).map(button=>button.value),['我','战','本','动','店']);
  assert.deepEqual(defaultBar(payload).map(button=>button.options.data),['/我','/属性面板','/查看主线','/我的活动','/商店']);
  assert.equal(md(payload)[0].type,'MD.bold');
  for(const button of buttons(md(payload)))assert.match(button.value,/^‹.+›$/);
  for(const quote of md(payload).filter(node=>node.type==='MD.blockquote')){
    assert.ok(quote.value.some(node=>node.type==='MD.text'||node.type==='MD.bold'));
    assert.ok(quote.value.some(node=>node.type==='MD.button'));
  }
  const firstQuote=md(payload).findIndex(node=>node.type==='MD.blockquote');
  assert.ok(md(payload).slice(0,firstQuote).some(node=>node.type==='MD.button'),'compact header precedes objects');
}

test('settings preserves its native bubble and local controls after the combined API', async()=>{
  const payload=await render(settings,'/我的设置');
  assertPanel(payload);
  const preview=panelText(payload);
  assert.ok(preview.startsWith('**修行设置**'));
  for(const label of ['秘境战法','组队精力','好友自动入队','接受组队邀请','自动赴约'])assert.ok(preview.includes(label));
  const actions=buttons(md(payload)).map(button=>button.options.data);
  for(const command of ['/配置秘境模式 手动','/配置组队精力 不消耗','/配置接受队伍邀请 关闭'])assert.ok(actions.includes(command));
  writeFileSync('/tmp/xiuxian-combined-settings-preview.md',preview);
});

test('real SDK and FormatGui preserve panel order, local quote actions, page navigation and the default five-button bar',async()=>{
  state.access.moreVisibleCommands=allCommands;
  const samples=[];
  for(const [handler,text] of [[more,'/更多'],[more,'/更多 挑战'],[more,'/更多 挑战 2'],[more,'/更多 权益与充值'],[more,'/更多 个人资料'],[more,'/更多 游戏资料'],[settings,'/我的设置']]){
    const payload=await render(handler,text);assertPanel(payload);samples.push({command:text,payload});
    const preview=panelText(payload);
    assert.doesNotMatch(preview,/>\s*>/,'preview must not invent nested quote blocks');
    assert.ok(preview.startsWith(`**${md(payload)[0].value}**`),'bold panel titles stay bold');
    assert.equal(preview.split(/\n\n/).filter(block=>block.startsWith('>')).length,md(payload).filter(node=>node.type==='MD.blockquote').length,'each native quote remains a distinct preview block');
  }
  const first=md(samples[1].payload);const second=md(samples[2].payload);
  assert.ok(!buttons(md(samples[0].payload)).some(button=>button.options.data==='/攻略'||button.value.includes('交流频道')));
  assert.ok(first.some(node=>node.type==='MD.button'&&node.options.data==='/更多 挑战 2'));
  assert.ok(second.some(node=>node.type==='MD.button'&&node.options.data==='/更多 挑战 1'));
  assert.equal(md(samples[3].payload)[0].value,'仙缘与供奉');
  assert.ok(buttons(md(samples[3].payload)).some(button=>button.options.data==='/充值'));
  assert.equal(md(samples[6].payload)[0].value,'修行设置');
  for (const sample of samples.slice(0, 6)) {
    for (const quote of md(sample.payload).filter(node=>node.type==='MD.blockquote')) {
      assert.equal(quote.value[0].type, 'MD.button', 'entry names are clickable on the first row');
      assert.ok(!['[前往]', '[查看]'].includes(quote.value[0].value));
    }
  }
  for (const quote of md(samples[6].payload).filter(node=>node.type==='MD.blockquote').slice(0, 7)) {
    assert.equal(quote.value[0].type, 'MD.text');
    assert.ok(quote.value.findIndex(node=>node.type==='MD.button') < quote.value.findIndex(node=>node.type==='MD.newline'), 'setting action accompanies its current state');
  }
  writeFileSync('/tmp/xiuxian-navigation-native-payload.json',JSON.stringify(samples,null,2)+'\n');
  writeFileSync('/tmp/xiuxian-navigation-native-panels.md',samples.map(sample=>`## ${sample.command}\n\n${panelText(sample.payload)}`).join('\n'));
});

test('native guest-only and single commercial leaf panels retain reachable ancestry and expose no other leaf',async()=>{
  state.access={registered:false,moreVisibleCommands:['/图鉴'],foldVisibleCommands:['/我的称号']};
  const root=await render(more,'/更多');assert.deepEqual(buttons(md(root)).filter(button=>button.options.data.startsWith('/更多 ')).map(button=>button.options.data),['/更多 设置']);
  const group=await render(more,'/更多 设置');assert.ok(buttons(md(group)).some(button=>button.options.data==='/更多 游戏资料'));
  assert.ok(!buttons(md(group)).some(button=>button.options.data==='/更多 个人资料'));
  const child=await render(more,'/更多 游戏资料');assert.ok(buttons(md(child)).some(button=>button.options.data==='/图鉴'));
  for(const command of ['/我的权益','/充值','/邀请码']){
    state.access={registered:true,moreVisibleCommands:[command],foldVisibleCommands:[]};
    const parent=await render(more,'/更多 福利');assert.ok(buttons(md(parent)).some(button=>button.options.data==='/更多 权益与充值'));
    const commercial=await render(more,'/更多 权益与充值');
    assert.deepEqual(md(commercial).filter(node=>node.type==='MD.blockquote').flatMap(node=>buttons(node.value)).map(button=>button.options.data),[command]);
  }
});


test('new entrances keep their native compact rows and invitation history returns to its parent', async()=>{
  state.access={registered:true,moreVisibleCommands:allCommands,foldVisibleCommands:[]};
  const samples=[];
  for (const text of ['/更多 修行问道','/更多 道友往来','/更多 仙途机缘','/更多 仙缘与供奉','/更多 藏经阁']) {
    const payload=await render(more,text);
    assertPanel(payload);
    samples.push({command:text,payload});
  }
  const commands = payload=>buttons(md(payload)).map(button=>button.options.data);
  assert.ok(commands(samples[0].payload).includes('/天师宝录'));
  assert.ok(commands(samples[1].payload).includes('/飞信'));
  assert.ok(commands(samples[2].payload).includes('/礼包码'));
  assert.ok(commands(samples[3].payload).includes('/里程碑'));
  assert.ok(buttons(md(samples[3].payload)).some(button=>button.value==='‹邀请码›'&&button.options.data==='/邀请码'));
  assert.ok(commands(samples[4].payload).includes('/天书'));
  const invitation=await render(invite,'/邀请码');
  assert.ok(commands(invitation).includes('/更多 权益与充值'));
  assert.ok(!commands(invitation).includes('/更多 设置'));
  assert.ok(commands(invitation).includes('/领取邀请奖励'));
  samples.push({command:'/邀请码',payload:invitation});
  writeFileSync('/tmp/xiuxian-more-completed-panels.md',samples.map(sample=>`## ${sample.command}\n\n${panelText(sample.payload)}`).join('\n'));
});
