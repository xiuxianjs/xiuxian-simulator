import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';


const state = globalThis.__panelSubscriptionReminder = {};
const framework = createPresentationHarness(state);
const seams = new Set(['@src/api/bot/client', '@src/api/bot/task-panel-view', '@src/response/config', '@src/response/robotBusiness', '@src/utils/useMessage']);
const bundle = await build({
  stdin: { contents: "export {default as panel} from './src/response/taskPanel/res.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'panel-subscription', setup(b) {
    b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
    b.onResolve({filter:/.*/},a=>seams.has(a.path)?{path:a.path,namespace:'seam'}:undefined);
    b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
      const s=globalThis.__panelSubscriptionReminder;
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const parseRobotTaskPanel=x=>x;
      export { useMessage } from 'alemonjs';
      export const requestBackend=async(bid,operation,args)=>{
        s.requests.push({bid,operation,args,sentBeforeQuery:s.sent.length});
        if(s.queryError)throw s.queryError;
        return s.subscription;
      };
      export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{
        s.business.push({op,args});
        if(s.handled)return {handled:true};
        if(s.businessError)throw s.businessError;
        e.uid=17;
        return {handled:false,data:{tabs:[{tabKey:'checkin',tabName:'签到',items:[],visible:true}],defaultTabKey:'checkin',requestedTab:''}};
      };
    `}));
  }}]
});
const { panel } = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const enabled = { platform:'other-platform',channelId:'another-group',botId:'another-bot',targetScope:'group',isEnabled:true,failureCount:4,lastDeliveryAt:null,lastError:'delivery failed',channelState:{state:'blocked'} };
async function run({random=0,subscription=null,event={},...overrides}={}) {
  Object.assign(state,{sent:[],requests:[],business:[],subscription,handled:false,queryError:null,businessError:null},overrides);
  const e={name:'message.create',UserId:'player',ChannelId:'group',isPrivate:false,MessageText:'/任务面板',...event};
  const original=Math.random;
  Math.random=()=>random;
  try {await framework.run(panel, e, ()=>{});}
  finally {Math.random=original;}
  return state;
}
function text(payload) {return JSON.stringify(payload);}
test('sampled missing or disabled subscription gets a separate reminder after the panel',async()=>{
  for(const subscription of [null,{...enabled,isEnabled:false}]) {
    const s=await run({subscription,random:0.09999});
    assert.equal(s.sent.length,2);
    assert.ok(text(s.sent[0]).includes('任务面板'));assert.ok(!text(s.sent[0]).includes('尚未开启群通知'));
    assert.ok(text(s.sent[1]).includes('尚未开启群通知'));assert.ok(text(s.sent[1]).includes('/开启群订阅'));
    assert.equal(s.business.length,1);
    assert.deepEqual(s.requests,[{bid:'player',operation:'get_players_id_notifications_group_subscription',args:{path:{id:17}},sentBeforeQuery:1}]);
  }
});
test('10 percent sample boundary skips queries and reminders when not selected',async()=>{
  for(const random of [0.1,0.5,0.9999]) {
    const s=await run({random});assert.equal(s.sent.length,1);assert.equal(s.requests.length,0);
  }
});
test('enabled subscription in any group is sufficient, even if delivery is temporarily blocked',async()=>{
  const s=await run({subscription:enabled});assert.equal(s.sent.length,1);assert.equal(s.requests.length,1);
});
test('private and missing channel contexts never offer the group-only enable action',async()=>{
  for(const event of [{isPrivate:true},{name:'private.message.create',isPrivate:false},{IsPrivate:true},{ChannelId:undefined}]) {
    const s=await run({event});assert.equal(s.sent.length,2);
    assert.ok(text(s.sent[1]).includes('/我的设置'));assert.ok(!text(s.sent[1]).includes('/开启群订阅'));
  }
});
test('unavailable or invalid subscription query does not imply disabled or break the panel',async()=>{
  const error=new Error('fixture network error');error.stack='test fixture';
  for(const overrides of [{queryError:error},{subscription:{}},{subscription:"invalid"}]) {
    const s=await run(overrides);assert.equal(s.sent.length,1);assert.equal(s.requests.length,1);
  }
});
test('handled and failed panel requests never perform an extra subscription check',async()=>{
  let s=await run({handled:true});assert.equal(s.requests.length,0);assert.equal(s.sent.length,0);
  const error=new Error('panel unavailable');error.stack='test fixture';
  s=await run({businessError:error});assert.equal(s.requests.length,0);assert.equal(s.sent.length,1);
  s=await run({event:{MessageText:'/别的指令'}});assert.equal(s.requests.length,0);assert.equal(s.business.length,0);
});
