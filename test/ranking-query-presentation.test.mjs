import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__rankingQueryPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as overview} from './src/response/ranking/viewRankings/res.ts';export {default as first} from './src/response/ranking/viewFirstRewards/res.ts';export {default as monthly} from './src/response/ranking/viewMonthlyRewards/res.ts';export {default as claimFirst} from './src/response/ranking/claimFirst/res.ts';export {default as claimMonthly} from './src/response/ranking/claimMonthly/res.ts';export {default as challenge} from './src/response/ranking/challengeRank/res.ts';export {default as batch} from './src/response/ranking/batchChallenge/res.ts';export {default as sweep} from './src/response/ranking/sweepLower/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__rankingQueryPresentation;state.calls++;if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);


const access={canUseFifthLayerFeature:true,realmName:'炼气九层',isOpen:true,openStartDay:2,openEndDay:28};
const first={...access,userRank:2,maxRank:1999,hasClaimableReward:true,rewards:[{ranking:3,state:'CLAIMABLE',description:'首通奖励说明'},{ranking:1,state:'CLAIMED'}]};
const monthly={...access,currentRank:2,bestRank:2,maxRank:1999,claimCount:1,bestClaimRank:8,claimStatus:'AVAILABLE',hasClaimableReward:true,rewards:[{id:1,rankingStart:1,rankingEnd:3,lingJing:2,spiritStone:4,state:'CLAIMABLE'}]};
const view={isOpen:true,myRank:2,top3:[{rank:1,id:'4',name:'青云',power:12000,isFake:false,isMe:false}],nearby:[{rank:2,id:'1',name:'本人',power:9000,isFake:false,isMe:true}],challengeCost:5,challengeTip:'挑战范围',rewardTip:'原奖励说明',sweepTargets:[]};

test('tower overview preserves ranking text, power formatting, self and same-response navigation',async()=>{
 const nodes=await render('overview','/通天塔',{view,tianjiaoVisible:true});
 for(const part of ['前三甲','青云','1.2w','本人','9k','👈','挑战范围','5点元力','原奖励说明'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/查看信息 4','/登天梯','/连续爬塔','/月度排名奖励','/扫荡排名'])assert.ok(commands(nodes).includes(command),command);
 assert.ok(!commands(await render('overview','/通天塔',{view,tianjiaoVisible:false})).includes('/登天梯'));
 const stopped=await render('overview','/通天塔',{text:'通天塔榜数据未初始化',buttons:[{label:'登天梯',command:'/登天梯'}]},true);
 assert.ok(textOf(stopped).includes('通天塔榜数据未初始化'));assert.ok(commands(stopped).includes('/登天梯'));
});

test('reward queries retain reward states, explanations and claim navigation',async()=>{
 const firstNodes=await render('first','/首通排名奖励',first);
 for(const part of ['当前排名：第 2 名','首通奖励说明','✅ 已领取','首次达到对应排名'])assert.ok(textOf(firstNodes).includes(part),part);
 for(const command of ['/领取首通奖励 3','/领取首通奖励 全部','/月度排名奖励','/通天塔'])assert.ok(commands(firstNodes).includes(command),command);
 const monthlyNodes=await render('monthly','/月度排名奖励',monthly);
 for(const part of ['本月最高排名：第 2 名','本月已领取 1 个档位','最高领奖排名：第 8 名','灵晶 x2','灵石 x4'])assert.ok(textOf(monthlyNodes).includes(part),part);
 for(const command of ['/领取月度奖励 1','/领取月度奖励 全部','/首通排名奖励'])assert.ok(commands(monthlyNodes).includes(command),command);
});

test('reward access and calendar closure remain original display branches',async()=>{
 for(const [name,command,data] of [['first','首通排名奖励',first],['monthly','月度排名奖励',monthly]]){
  const closed=textOf(await render(name,`/${command}`,{...data,isOpen:false}));assert.ok(closed.includes('通天塔每月2-28日开放'));
  const locked=textOf(await render(name,`/${command}`,{...data,canUseFifthLayerFeature:false,realmName:'炼气四层'}));assert.ok(locked.includes('炼气四层'));
 }
});

test('tower claim bubbles preserve single, batch, usage and false feedback navigation',async()=>{
 for(const [name,command,page] of [['claimFirst','领取首通奖励','首通排名奖励'],['claimMonthly','领取月度奖励','月度排名奖励']]){
  const single=await render(name,`/${command} 1`,{outcome:'single',ranking:1,claimedCount:1,rewardTexts:['灵晶 x3','灵石 x5']});
  assert.ok(textOf(single).includes('✅ 领取成功'));assert.ok(textOf(single).includes('灵晶 x3、灵石 x5'));assert.ok(commands(single).includes('/通天塔'));
  const batch=await render(name,`/${command} 全部`,{outcome:'batch',claimedCount:2,rewardTexts:['灵晶 x6']});assert.ok(textOf(batch).includes('✅ 批量领取成功'));assert.ok(textOf(batch).includes('已领取 2 个'));assert.ok(commands(batch).includes('/'+page));
  const usage=await render(name,`/${command} 0`,{outcome:'param_error'});assert.ok(textOf(usage).includes('❌ 参数错误'));assert.ok(textOf(usage).includes(`/${command} 全部`));
  const failed=await render(name,`/${command} 1`,{text:'奖励已领取'},true);assert.ok(textOf(failed).includes('❌ 领取失败'));assert.ok(textOf(failed).includes('奖励已领取'));assert.ok(commands(failed).includes('/'+page));
 }
});

const challenge={logId:'battle-1',success:true,message:'排名提升',oldRank:20,newRank:19,rankImproved:true,experienceGained:15,baseExperience:15,experienceBonusText:'',reputationGained:20,battle:{Winner:'A',Rounds:1,SideA:[],SideB:[]}};

test('tower challenge preserves battle result, memory links and insufficient-qi potion footer',async()=>{
 const nodes=await render('challenge','/挑战排名 19',challenge);
 for(const part of ['挑战成功！','排名提升','修为 +15','声望 +20','总回合数：1'])assert.ok(textOf(nodes).includes(part),part);
 for(const command of ['/查看战斗过程 battle-1','/通天塔','/首通排名奖励','https://tatian-online.alemonjs.com/components/battle-memory/battle-1'])assert.ok(commands(nodes).includes(command),command);
 const failed=await render('challenge','/挑战排名 19',{text:'元力不足',buttons:[{label:'服用元力丹',command:'/服用 元力丹 3'}]},true);assert.ok(commands(failed).includes('/服用 元力丹 3'));
 assert.ok(textOf(await render('challenge','/挑战排名 错误',{outcome:'param_error'})).includes('请输入正确的格式：/挑战排名 [排名]'));
});

test('tower batch preserves event feedback, stopped potion action and actual totals',async()=>{
 const nodes=await render('batch','/连续爬塔',{startRank:20,finalRank:19,rounds:[challenge],winCount:1,lossCount:0,experienceGained:15,experienceBonusText:'',reputationGained:20,events:[{index:1,outcome:'completed',message:'排名提升',displayText:'第1次：挑战成功',logId:'battle-1',needPotion:false,challenge},{index:2,outcome:'stopped',message:'元力不足',displayText:'第2次：元力不足',needPotion:true}]});
 for(const part of ['第1次：挑战成功','第2次：元力不足','战绩：1胜 0负','第20名 → 第19名','获得修为：+15','声望：+20'])assert.ok(textOf(nodes).includes(part),part);
 assert.ok(commands(nodes).includes('/服用 元力丹 3'));assert.ok(commands(nodes).includes('/查看战斗过程 battle-1'));
});

test('tower sweep retains list controls, empty state and direct settlement receipt',async()=>{
 const list=await render('sweep','/扫荡排名',{outcome:'list',view:{...view,myRank:2,sweepTargets:[{rank:3,id:'7',name:'道友',power:123,isFake:false,isMe:false}]}});
 for(const command of ['/查看信息 7','/扫荡排名 3 1','/扫荡排名 3 10'])assert.ok(commands(list).includes(command),command);
 assert.ok(textOf(await render('sweep','/扫荡排名',{outcome:'list',view:{...view,sweepTargets:[]}})).includes('没有更低排名的对手'));
 const result=await render('sweep','/扫荡排名 3 5',{outcome:'sweep',data:{targetRank:3,sweepCount:5,qiSpent:50,experienceGained:75,baseExperience:75,experienceBonusText:'',reputationGained:100}});
 assert.ok(textOf(result).includes('扫荡次数：5次'));assert.ok(textOf(result).includes('获得修为：+75'));assert.ok(commands(result).includes('/扫荡排名 3 5'));
});
