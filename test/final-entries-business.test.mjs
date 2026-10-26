import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';
import { logger } from 'alemonjs';
logger.error = () => {};
const entries = [
 ['shop/buy','/购买','shops.purchase'], ['mingwudan/confirm','/确认明悟丹','mingwu.confirm'], ['consume','/服用 123','items.consume'], ['consume','/服用 精力丹 0','items.consume'],
 ['shop/hub','/商店','shops.list'], ['shop/buy','/购买 301','shops.purchase'],
 ['itemDetail','/物品详情 灵石','items.detail'], ['breakthrough/perform','/突破','realm.breakthrough'],
 ['promotion/perform','/晋级','realm.promotion'], ['meditation/pulse','/冲脉','meridians.pulse'],
 ['meditation/meridian','/经络','meridians.view'], ['meditation/start','/打坐','meditation.start'],
 ['meditation/end','/打坐结束','meditation.end'], ['seclusion/info','/探索秘境','seclusion.command'],
 ['seclusion/end','/返程','seclusion.end'], ['greenBottle/store','/小绿瓶存储 1','green-bottle.store'],
 ['consume','/服用 精力丹 1','items.consume'], ['lootbox/open','/开启礼盒 测试礼盒 1','lootboxes.open'],
 ['peiyuanDan/confirm','/确认培元丹','peiyuan.confirm'], ['mingwudan/confirm','/确认明悟丹 1 1','mingwu.confirm'],
 ['tribulation','/我的渡劫','tribulation.command'], ['tribulation/publicRes','/劫云榜','tribulation.public'],
 ['seclusion/info','/探索秘境 桃花镇','seclusion.command'], ['seclusion/info','/探索秘境 桃花镇 48','seclusion.command'],
 ['greenBottle/store','/小绿瓶存储','green-bottle.capacity'], ['consume','/炼化 1','soul-artifacts.refine'],
 ['tribulation','/渡劫开劫 1 low 1 '+ 'a'.repeat(64),'tribulation.command']
];
const paths = [...new Set(entries.map(([p]) => p))];
const state = globalThis.__finalBusiness = { calls: [], sent: [], next: 0, legacy: 0 };
const framework = createPresentationHarness(state);
const built = await build({ stdin: { contents: paths.map((p,i)=>`export {default as entry${i}} from './src/response/${p.endsWith('Res') ? p + '.ts' : p + '/res.ts'}';`).join('\n') + `\nexport { SDKError as CommandSDKError } from './src/api/core/error.ts';`, resolveDir: process.cwd() }, bundle:true, write:false, platform:'node', format:'esm', packages:'external', plugins:[{name:'final-business',setup(b){
 b.onResolve({filter:/^@src\/response\/itemDetail\/builders$/},()=>({path:'item-builders',namespace:'item-builders'}));
 b.onLoad({filter:/.*/,namespace:'item-builders'},()=>({loader:'ts',contents:`export const buildItemDetail=(item,grade,md,uid)=>{globalThis.__finalBusiness.itemUid=uid;md.addText(item.name)};export const buildEquipmentDetail=()=>{};export const buildProfessionToolDetail=()=>{};export const buildSkillBookDetail=()=>{};`}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^(?:\.\/robotBusiness|@src\/(utils\/useMessage|response\/(config|robotBusiness)))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},a=>a.importer.includes('/api/bot/') ? ({path:'client',namespace:'seam'}) : null);
 b.onResolve({filter:/^(?:@[^/]+\/|[a-z])/},a=>a.path.startsWith('@src/')||a.path.startsWith('node:')?null:({path:import.meta.resolve(a.path),external:true}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({loader:'ts',contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export class BackendAPIError extends Error { constructor(message,code,status,requestId,details){super(message);Object.assign(this,{code,status,requestId,details})} }
 export const writeContext=()=>({});
 export const writeTraceContext=()=>({});
 export const requestBackend=async()=>{globalThis.__finalBusiness.legacy++;throw new Error('legacy API forbidden')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__finalBusiness;s.calls.push({op,args});if(s.mode==='middleware'){e.__res={success:true,branch:'middleware'};next();return {handled:true}};if(s.mode==='reject')return {handled:true};if(s.mode==='feedback'){await feedback(s.payload);return {handled:true}};if(s.mode==='transport')throw new Error('transport failed');if(s.mode==='business-error')throw s.error;e.uid=1;return {handled:false,data:decode(s.payload,1)}};
 `}));
 }}]});
const handlers = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
async function run(path,text,mode,payload){ Object.assign(state,{calls:[],sent:[],next:0,legacy:0,mode,payload});const e={name:'message.create',Platform:'qq',UserId:'player',MessageId:'final-test',MessageText:text,isPrivate:false};const handler=handlers['entry'+paths.indexOf(path)];await framework.invoke(e, ()=>typeof handler==='function'?handler(e,()=>state.next++):handler.current(e), ()=>state.next++);return e; }
test('all 19 entries and their subcommands request one exact operation and pass middleware to parent res',async()=>{
 for(const [p,text,op] of entries){const e=await run(p,text,'middleware');assert.deepEqual(state.calls.map(x=>x.op),[op],text);assert.equal(state.next,1,text);assert.equal(state.legacy,0,text);assert.equal(state.sent.length,0,text);assert.equal(e.__res.branch,'middleware',text)}
});
test('a false result ends every migrated entry without parent next or supplementary API',async()=>{
 for(const [p,text,op] of entries){await run(p,text,'reject');assert.deepEqual(state.calls.map(x=>x.op),[op],text);assert.equal(state.next,0,text);assert.equal(state.legacy,0,text);assert.equal(state.sent.length,0,text)}
});
test('captured consume and green bottle results render business bubbles without legacy APIs',async()=>{
 await run('consume','/服用 精力丹 1','success',{outcome:'consumed',message:'使用成功',remainingQuantity:2});assert.equal(state.calls.length,1);assert.equal(state.legacy,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),/使用成功/);
 await run('greenBottle/store','/小绿瓶存储 1','success',{success:true,message:'存储成功',experienceCost:1000,converted:1,remainingExp:0,totalBottles:1});assert.equal(state.calls.length,1);assert.equal(state.legacy,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),/存储成功/);
});
test('all active entry source files preserve exact routing and have no repeat or access HTTP after business',()=>{
 for(const p of paths){const s=readFileSync(resolve('src/response',p.endsWith('Res')?p+'.ts':p+'/res.ts'),'utf8');assert.doesNotMatch(s,/withBackendRepeatDetection|getBackendRealmAccess/,p)}
});

test('controlled business refusals retain their bubbles and do not call next',async()=>{
 const cases=[['meditation/end','/打坐结束','打坐','❌ 你当前没有在打坐',[]],['greenBottle/store','/小绿瓶存储 1','小绿瓶存储','❌ 境界不足',[{label:'小绿瓶存储',command:'/小绿瓶存储'}]],['consume','/服用 精力丹 1','❌','当前不能使用',[{label:'储物袋',command:'/我的储物袋'}]]];
 for(const [p,text,title,replyText,buttons] of cases){await run(p,text,'feedback',{title,heading:'',text:replyText,buttons,advice:[]});assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacy,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes(replyText))}
});

test('seclusion transport errors retain view/select/start error bubbles with one request',async()=>{
 for(const [text,expected] of [['/探索秘境','查看探索状态失败'],['/探索秘境 桃花镇','查看失败'],['/探索秘境 桃花镇 48','探索失败']]){await run('seclusion/info',text,'transport');assert.equal(state.calls.length,1);assert.equal(state.legacy,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.match(JSON.stringify(state.sent),new RegExp(expected))}
});

test('item details use the UID resolved by the combined API for bubble construction',async()=>{
 state.itemUid=undefined;
 await run('itemDetail','/物品详情 灵石','success',{memorial:null,entries:[{category:'item',record:{id:1,name:'灵石'},view:[],sources:{stages:[],dungeons:[],recipes:[],shops:[],guildShop:[],materials:[]},setEffects:[],grade:null,lore:null,equipmentSet:null}]});
 assert.equal(state.itemUid,1);assert.equal(state.calls.length,1);assert.equal(state.legacy,0);assert.equal(state.sent.length,1);
});


test('seclusion return preserves business rejection and hides transport/internal error details',async()=>{
 for(const [error,expected] of [
  [new handlers.CommandSDKError('你现在没有可以结算的探索。',{code:'CONFLICT',status:409}),'你现在没有可以结算的探索。'],
  [new handlers.CommandSDKError('context deadline exceeded',{code:'INTERNAL',status:500}),'服务暂时不可用，请稍后再试'],
  [new handlers.CommandSDKError('request timed out',{code:'SDK_TIMEOUT'}),'服务暂时不可用，请稍后再试']
 ]){
  state.error=error;
  await run('seclusion/end','/返程','business-error');
  assert.equal(state.calls.length,1);assert.equal(state.legacy,0);assert.equal(state.next,0);
  assert.equal(framework.result.messages.length,1);
  const message=JSON.stringify(framework.result.messages[0]);
  assert.ok(message.includes(expected),message);
  assert.doesNotMatch(message,/返程失败|context deadline exceeded|request timed out/);
 }
});
