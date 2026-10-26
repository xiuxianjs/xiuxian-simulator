import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { replaceExpectedText } from './helpers/recovery-delta.mjs';
import dayjs from 'dayjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__marketPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const kinds=['list','my','records','credibility'];
const bundle=await build({stdin:{contents:kinds.map(k=>`export {default as ${k}} from './src/response/market/${k}/res.ts';export {default as old_${k}} from 'old-${k}';`).join('')+`export {parseBackendMarketTrades} from './src/api/bot/queries.ts';export {parseMarketCommand,shouldQueryMarket,buildMarketCommand} from './src/response/market/command.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'market-presentation',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path,namespace:'legacy'}));
 // List layout intentionally removes the duplicate header; retain the original item and paging assertions.
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>{
  const contents=readFileSync(new URL(`./fixtures/market-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8');
  return {loader:'ts',contents:a.path==='old-list'?contents.replace(/header: getMarketHeaderButtons\(\),/g,''):contents,resolveDir:process.cwd()};
 });
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|response-apps\/market\/[^/]+\/app|api\/bot\/(context|market-guide-balance))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},a=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export const createBackendRequestContext=()=>({});
 export const getBackendMarketGuideBalance=async()=>{const value=globalThis.__marketPresentation.result.data.spiritsCrystal;if(value===null)throw new Error('optional balance');return value};
 export { useMessage } from 'alemonjs';
 export default async()=>globalThis.__marketPresentation.legacy;
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__marketPresentation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessMarketQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_MARKET_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));assert.ok(rows.length>20);
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const fullTime=value=>value===null||value===undefined?'暂无':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value));
async function render(kind,text){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(h[kind], e, ()=>{state.next++});return state.sent;}
const kindOf=op=>({'market.browse':'list','market.my-listings':'my','market.records':'records','market.credibility':'credibility'})[op];
function command(row){row={...row,args:{...row.args,page:row.args.page==='1e+100'?BigInt(1e100).toString():row.args.page}};if(row.op==='market.browse'){if(row.args.view==='guide')return '/珍宝楼 搜索';if(row.args.view!=='browse')return '/珍宝楼';if(row.args.keyword)return `/珍宝楼 搜索 ${row.args.keyword} 价格升序 ${row.args.page}`;if(row.args.categoryType)return '/珍宝楼 筛选 道具';return `/珍宝楼 ${row.args.sort==='latest'?'最新':row.args.sort==='price_desc'?'价格降序':'价格升序'} ${row.args.page}`;}if(row.op==='market.my-listings')return `/我的上架 ${row.args.page}`;if(row.op==='market.records')return `/我的交易记录 ${row.args.mode==='buy'?'买':row.args.mode==='sell'?'卖':''} ${row.args.page}`;return '/信誉分';}
test('market preserves original full bubbles, buttons, anonymity, guide and pagination with real backend data',async()=>{
 for(const row of rows.filter(r=>r.result.success&&r.result.branch==='business')){
  const kind=kindOf(row.op);state.result=row.result;let data=row.result.data;
  if(kind==='records'){data=h.parseBackendMarketTrades(data);const mode=row.args.mode;data={...data,title:mode==='buy'?'交易记录（买）':mode==='sell'?'交易记录（卖）':'交易记录',cmdPrefix:mode==='buy'?'/我的交易记录 买':mode==='sell'?'/我的交易记录 卖':'/我的交易记录'};}
  state.legacy={code:'OK',data};const actual=await render(kind,command(row));assert.equal(state.calls,1);assert.equal(state.op,row.op);assert.equal(state.next,0);assert.equal(actual.length,1);
  let expected=await render('old_'+kind,command(row));
  if(kind==='records')for(const trade of data.rows){
   expected=replaceExpectedText(expected,`ID：${trade.listingId}  时间：${dayjs(trade.created_at).format('MM-DD HH:mm')}`,`ID：${trade.listingId}  时间：${fullTime(trade.created_at)}`);
  }
  if(kind==='my')for(const item of data.items){
   const time=item.expiresAt||item.createdAt;
   expected=replaceExpectedText(expected,`时间：${dayjs(time).format('MM-DD HH:mm')}`,`时间：${fullTime(time)}`);
  }
  assert.deepEqual(actual,expected);
  if(kind==='records'&&row.args.mode==='sell')assert.ok(textOf(actual[0]).includes('对方：匿名'));
 }
});
test('market refusal retains original feedback bubble and ends without next',async()=>{
 for(const row of rows.filter(r=>!r.result.success)){const kind=kindOf(row.op);state.result=row.result;state.legacy={code:'LOAD_FAILED',data:{message:row.result.middleware.replies.at(-1).text}};const actual=await render(kind,command(row));assert.equal(state.calls,1);assert.equal(state.next,0);assert.deepEqual(actual,await render('old_'+kind,command(row)));}
});
test('market transport and invalid DTO fail once without retries; middleware delegates without business bubble',async()=>{
 for(const kind of kinds){for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(kind,kind==='list'?'/珍宝楼':kind==='my'?'/我的上架':kind==='records'?'/我的交易记录':'/信誉分');assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;state.result=rows.find(r=>r.op===Object.keys({'market.browse':'list','market.my-listings':'my','market.records':'records','market.credibility':'credibility'}).find(op=>kindOf(op)===kind)&&r.result.branch==='middleware').result;await render(kind,kind==='list'?'/珍宝楼':kind==='my'?'/我的上架':kind==='records'?'/我的交易记录':'/信誉分');assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
