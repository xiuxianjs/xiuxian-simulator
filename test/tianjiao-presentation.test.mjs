import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__tianjiaoPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as leaderboard} from './src/response/tianjiao/leaderboard/res.ts';export {default as rewards} from './src/response/tianjiao/rewards/res.ts';export {default as challenge} from './src/response/tianjiao/challenge/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__tianjiaoPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


const board={isVisible:true,canChallenge:false,lockedMessage:'尚未开放',requiredText:'需炼气圆满',suggestedTarget:2,requiredRealmName:'炼气圆满',stageName:'炼气',stageLevel:1,myRank:2,attemptsLeft:9,entries:[{rank:2,occupied:true,userName:'青云',realmName:'炼气圆满',power:123,isMe:true},{rank:3,occupied:false,userName:'',realmName:'',power:0,isMe:false}]};
const reward={isVisible:true,stageLevel:1,stageName:'炼气',configs:[],records:[],view:{lockedMessage:'尚未开放',tiers:[{rank:2,rewardText:'灵石 x11',claimedAt:'2026-10-08T12:00:00+08:00'}],records:[{stageLevel:1,stageName:'炼气',rank:2,rewardText:'灵石 x11',claimedAt:'2026-10-08T12:00:00+08:00'}],recordTotal:21}};
test('leaderboard preserves preview, self marker, attempts and original navigation',async()=>{
 const nodes=await render('leaderboard','/登天梯',board);
 for(const part of ['青云','· 你','今日剩余次数：9','当前仅可预览榜单与奖励','第3名：空位'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/登天奖励','/排行榜'])assert.ok(commands(nodes).includes(command),command);
 assert.ok(!commands(nodes).some(command=>command.startsWith('/登天挑战 ')));
 assert.ok(textOf(await render('leaderboard','/登天梯',{...board,isVisible:false})).includes('尚未开放'));
});
test('leaderboard attaches each eligible challenge to its own rank quote',async()=>{
 const entries=Array.from({length:10},(_,index)=>({rank:index+1,occupied:index!==1,userName:`道友${index+1}`,realmName:'炼气圆满',power:123,isMe:index===3}));
 const ranked={...board,canChallenge:true,myRank:4,suggestedTarget:3,entries};
 const nodes=await render('leaderboard','/登天梯',ranked);
 assert.deepEqual(commands(nodes).filter(command=>command.startsWith('/登天挑战 ')),['/登天挑战 1','/登天挑战 2','/登天挑战 3']);
 const quotes=state.sent[0].flatMap(node=>Array.isArray(node.value)?node.value:[]).filter(node=>node.type==='MD.blockquote');
 for(const rank of [1,2,3]) {
   assert.ok(quotes.some(quote=>{const parts=flatten(quote.value);return textOf(parts).includes(`第${rank}名：`)&&commands(parts).includes(`/登天挑战 ${rank}`);}));
 }
 const vacantQuote=quotes.find(quote=>textOf(flatten(quote.value)).includes('第2名：空位'));
 assert.ok(vacantQuote);assert.ok(flatten(vacantQuote.value).some(node=>node.type==='MD.button'&&node.value==='‹占位›'&&node.options.data==='/登天挑战 2'));
 const occupiedQuote=quotes.find(quote=>textOf(flatten(quote.value)).includes('第1名：'));
 assert.ok(flatten(occupiedQuote.value).some(node=>node.type==='MD.button'&&node.value==='‹挑战›'));
 const unranked=await render('leaderboard','/登天梯',{...ranked,myRank:null,entries:entries.map(entry=>({...entry,isMe:false}))});
 assert.deepEqual(commands(unranked).filter(command=>command.startsWith('/登天挑战 ')),Array.from({length:10},(_,index)=>`/登天挑战 ${index+1}`));
 assert.ok(textOf(unranked).includes('我的排名：未入榜'));assert.ok(unranked.some(node=>node.type==='MD.button'&&node.value==='‹占位›'));
 for(const data of [{...ranked,attemptsLeft:0},{...ranked,canChallenge:false},{...ranked,myRank:1}]) {
   assert.ok(!commands(await render('leaderboard','/登天梯',data)).some(command=>command.startsWith('/登天挑战 ')));
 }
 assert.ok(textOf(await render('leaderboard','/登天梯',{...ranked,attemptsLeft:0})).includes('挑战状态：今日次数已用完'));
 const outside=await render('leaderboard','/登天梯',{...ranked,myRank:17,entries:entries.map(entry=>({...entry,isMe:false}))});
 assert.deepEqual(commands(outside).filter(command=>command.startsWith('/登天挑战 ')),Array.from({length:10},(_,index)=>`/登天挑战 ${index+1}`));
});
test('rank outside the top ten exposes every higher seat and marks self correctly',async()=>{
 const entries=Array.from({length:20},(_,index)=>({rank:index+1,occupied:index!==11,userName:`道友${index+1}`,realmName:'炼气圆满',power:123,isMe:index===17}));
 const nodes=await render('leaderboard','/登天梯',{...board,canChallenge:true,myRank:18,entries});
 assert.deepEqual(commands(nodes).filter(command=>command.startsWith('/登天挑战 ')),Array.from({length:17},(_,index)=>`/登天挑战 ${index+1}`));
 assert.ok(textOf(nodes).includes('第12名：空位'));
 assert.ok(textOf(nodes).includes('第18名：道友18（炼气圆满，战力123） · 你'));
 assert.ok(!textOf(nodes).includes('未展示在前10'));
});
test('rewards preserve tier, dates, history total and navigation',async()=>{
 const nodes=await render('rewards','/登天奖励',reward);
 for(const part of ['灵石 x11','10-08','仅展示最近20条，共 21 条记录'])assert.ok(textOf(nodes).includes(part),part);
 assert.ok(commands(nodes).includes('/登天梯'));
 assert.ok(textOf(await render('rewards','/登天奖励',{...reward,isVisible:false})).includes('尚未开放'));
});
test('challenge preserves direct occupancy, battle memory, usage and stopped feedback',async()=>{
 const receipt={success:true,message:'占位成功',oldRank:null,newRank:2,directOccupy:true,rewardText:'灵石 x11'};
 const nodes=await render('challenge','/登天挑战 2',receipt);
 for(const part of ['占位成功','首次上榜：第2名','无需战斗','灵石 x11'])assert.ok(textOf(nodes).includes(part),part);
 const fight=await render('challenge','/登天挑战 1',{...receipt,oldRank:2,newRank:1,directOccupy:false,logId:'tianjiao-1',battle:{Rounds:1,SideA:[{Name:'本人',HP:100,MaxHP:100,Dead:false}],SideB:[{Name:'镜像',HP:0,MaxHP:1,Dead:true}]}});
 for(const part of ['挑战成功','第2名 → 第1名','总回合数：1','镜像'])assert.ok(textOf(fight).includes(part),part);
 assert.ok(commands(fight).includes('/查看战斗过程 tianjiao-1'));
 assert.ok(textOf(await render('challenge','/登天挑战 0',{text:'登天挑战参数无效'},true)).includes('登天挑战参数无效'));
 assert.ok(textOf(await render('challenge','/登天挑战 9999999999999999999',{outcome:'param_error'})).includes('请输入正确的格式'));
 assert.deepEqual(await render('challenge','/登天挑战 错误',{outcome:'no_match'}),[]);
});

test('unranked empty board exposes all ten direct occupancy seats and respects attempts',async()=>{
 const empty={...board,canChallenge:true,myRank:null,entries:Array.from({length:10},(_,i)=>({rank:i+1,occupied:false,userName:'',realmName:'',power:0,isMe:false}))};
 const nodes=await render('leaderboard','/登天梯',empty);
 assert.deepEqual(commands(nodes).filter(c=>c.startsWith('/登天挑战 ')),Array.from({length:10},(_,i)=>`/登天挑战 ${i+1}`));
 assert.equal(nodes.filter(n=>n.type==='MD.button'&&n.value==='‹占位›').length,10);
 assert.ok(!textOf(nodes).includes('暂无镜像'));
 for(const data of [{...empty,attemptsLeft:0},{...empty,canChallenge:false}])assert.ok(!commands(await render('leaderboard','/登天梯',data)).some(c=>c.startsWith('/登天挑战 ')));
});
