import { inspectMessage } from 'alemonjs/testing';
import { rechargeBubbleSemantics } from './helpers/recharge-bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__rechargeCatalog={};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRechargeCatalog','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_RECHARGE_CATALOG=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,18);
// Historical baseline with the explicitly retired section and footer removed.
function activeCatalogSource(source) {
 const start=source.indexOf("    md.addBold('🎐 限时活动充值');");
 const end=source.indexOf('    // ── 月卡',start);
 return (source.slice(0,start)+source.slice(end)).replace("          { label: '赞助', command: '/赞助' },\n",'').replace('活动充值相关信息','充值相关信息')
  .replace("    md.addBlockquote(Format.createMarkdown().addText('普通充值仅走常规充值规则，不触发限时活动临时套餐逻辑。'));\n",'')
  .replace("          { label: '查看活动充值', command: '/活动充值' },\n",'')
  .replace('(${mc.yuan}¥)', '(${mc.yuan}¥${mc.doubleText}${mc.limitText})')
  .replace('(${sp.yuan}¥)', '(${sp.yuan}¥${sp.doubleText}${sp.limitText})');
}
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/recharge/info/res.ts';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:activeCatalogSource(readFileSync(new URL('./fixtures/recharge-catalog-before-v2.ts.txt',import.meta.url),'utf8')),resolveDir:resolve('src/response/recharge/info')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__rechargeCatalog;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport||s.row.status!==200)throw new Error('query failed');return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__rechargeCatalog;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
async function run(mode,row,command='/充值'){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'catalog',MessageText:command,isPrivate:row.private};
 await framework.run(handlers[mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return state.sent;
}
test('catalog preserves full original packages, benefit descriptions and permission footer without retired activity packages with one request',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted')){
  const actual=await run('current',row);assert.doesNotMatch(JSON.stringify(actual),/赞助|活动充值|活动临时充值套餐/);assert.deepEqual(state.calls,[{operation:'recharge.catalog',args:row.arguments}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  if (row.result.success) {
    const indexView = inspectMessage(actual.flat());
    assert.ok(indexView.commands.includes('/我的权益'));
    assert.ok(indexView.commands.includes('/充值 月卡'));
    assert.deepEqual(indexView.commands.filter(c => c.startsWith('/充值购买 ')), row.result.data.catalog.packages.filter(p => ['month_card','seclusion_pass'].includes(p.packageType)).sort((a,b) => ['month_card','seclusion_pass'].indexOf(a.packageType)-['month_card','seclusion_pass'].indexOf(b.packageType)).map(p => `/充值购买 ${p.id}`));
    for (const [category, type, benefit] of [['道晶套餐', 'normal', []], ['月卡', 'month_card', row.result.data.catalog.benefitView.monthCardPrivilegeLines], ['金手指', 'seclusion_pass', row.result.data.catalog.benefitView.seclusionPassPrivilegeLines], ['优惠礼包', 'first_charge', []]]) {
      const detail = await run('current', row, `/充值 ${category}`);
      assert.equal(state.calls.length, 1); assert.equal(state.legacy.length, 0);
      const view = inspectMessage(detail.flat());
      assert.ok(view.commands.includes('/我的权益'));
      const packages = row.result.data.catalog.packages.filter(p => p.packageType === type);
      assert.deepEqual(view.commands.filter(c => c.startsWith('/充值购买 ')), packages.map(p => `/充值购买 ${p.id}`));
      for (const pkg of packages) {
        assert.ok(view.text.includes(pkg.name)); assert.ok(view.text.includes(`¥${pkg.priceYuan}`));
        for (const line of [pkg.description, ...pkg.rewardParts, pkg.limitText, pkg.doubleText].filter(Boolean)) assert.ok(view.text.includes(line), line);
      }
      if (packages.length) for (const line of benefit) assert.ok(view.text.includes(line), line);
    }
  } else {
    assert.deepEqual(rechargeBubbleSemantics(actual, ['/我的权益']), rechargeBubbleSemantics(await run('old', row), ['/我的权益']));
    assert.equal(state.legacy.length,row.private?(row.status===200?2:1):0);
  }
 }
});
test('catalog only middleware advances next; damaged DTO and transport errors keep original failure bubble',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.sent.length,0);assert.equal(state.next,1);}
 const ready=rows.find(r=>r.state==='ready'&&r.private);
 for(const transport of [false,true]){
  const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
  const actual=await run('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.deepEqual(rechargeBubbleSemantics(actual,['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']),rechargeBubbleSemantics(await run('old',row),['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单']));
 }
});
