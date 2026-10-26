import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__skillSwitch={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`import * as current from './src/response/skillBook/switch/res.ts';import * as original from 'old-switch';export {current,original};`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-switch$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-switch-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^(\.\/client|@src\/api\/bot\/client)$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export class BackendAPIError extends Error {constructor(message,code){super(message);this.code=code}}
 export const requestBackend=async(bid,op,request)=>{const s=globalThis.__skillSwitch;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(op==='post_players_id_skill_books_skillBookId_switch'&&!Number.isSafeInteger(request.path.skillBookId))throw new BackendAPIError('Invalid parameter skillBookId','SDK_INVALID_REQUEST');
 if(op==='post_players_id_client_state_repeat_record')return {count:1,suffix:s.row.repeatSuffix??''};
 const isOptions=op==='get_players_id_skill_books_switch_options';const status=isOptions?s.row.optionsStatus:s.row.status;const raw=isOptions?s.row.optionsV1:s.row.v1;
 if(status!==200)throw new BackendAPIError(raw?.error?.message??'SDK_ERROR',raw?.error?.code);return raw.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillSwitch;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillSwitch','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_SWITCH=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,126);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind][{战技:'switchBattleSkill',被动技:'switchPassiveSkill',神通:'switchMysticSkill'}[row.arguments?.skillType??'战技']], e, ()=>state.next++);return structuredClone(state.sent);}
test('skill switching options, confirmation and transaction results preserve original group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.switch',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  let reviewed=actual;
  const expected=bubbleSemantics(await run('original',row,isPrivate));
  if(!row.result.success){
   const text=row.result.middleware.replies.at(-1).text;
   const tips=/您还没有已学习的.+类功法/.test(text)?[{command:'/储物袋 功法',text:'当前类型没有可显示的已学功法'},{command:'/我的功法',text:'当前选择列表为空不代表全部功法丢失'}]
    : /功法不存在或未学习|功法未学习|该功法已经在使用中|类型不匹配/.test(text)?[{command:'/我的功法',text:'核对'}]
    : [{command:'/我的功法',text:'失败提示不证明装备一定未切换'},{command:'/储物袋 功法',text:'不把切换失败当作需要再次购买'}];
   reviewed=withoutExpectedAdvice(actual,tips);
  }else if(row.result.data.code==='SHOW_LIST'){
   const options=row.result.data.options;
   assert.ok(bubbleSemantics(actual).text.includes('选择功法后由服务器检查；替换当前功法时需核对比较并确认'));
   reviewed=replaceExpectedText(actual,'选择功法后由服务器检查；替换当前功法时需核对比较并确认','点击 [切换] 可直接装备对应功法');
   if(!options.some(book=>book.canSwitch)){
    reviewed=withoutExpectedAdvice(reviewed,[{command:'/我的功法',text:'失败提示不证明装备一定未切换'},{command:'/储物袋 功法',text:'不把切换失败当作需要再次购买'}]);
    const explanation='当前没有其他可切换功法，请核对已学列表与当前装备。';assert.ok(bubbleSemantics(actual).text.includes(explanation));reviewed=replaceExpectedText(reviewed,explanation,'');
   }
  }else if(row.result.data.result.outcome==='confirmation_required'){
   const explanation='本次尚未切换；确认后由服务器重新检查实例与当前装备，不接受时返回我的功法。';
   assert.ok(bubbleSemantics(actual).text.includes(explanation));assert.ok(bubbleSemantics(actual).commands.includes('/我的功法'));
   reviewed=replaceExpectedText(actual,explanation,'');expected.commands=[...new Set([...expected.commands,'/我的功法'])].sort();
  }
  assert.deepEqual(bubbleSemantics(reviewed),expected,row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/切换战技 2',arguments:{skillType:'战技'},result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('功法切换结果未获完整确认'));}state.transport=false;
});
