import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import {executeBackendCaveCommand,parseBackendCaveCommand,type CaveCommandInput} from '../src/api/bot/cave-command';
import {getBackendCaveAccelerationPreview,parseBackendCaveAccelerationPreview} from '../src/api/bot/cave-plot-actions';
import {caveActionCommand,parseRobotCaveAction} from '../src/api/bot/cave-robot-command';

test('actual original cave action SDK preserves command bodies, preview and committed receipts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessCaveActionsV1StateAndReceipts$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_CAVE_ACTION_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(rows.length,272);
 mockBackendConfig(t,{api_url:'https://cave-action.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:{url:string,data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string,data?:string})=>{calls.push(call);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const [n,row] of rows.entries()){
  current=row;calls.length=0;const selected=caveActionCommand(row.text);assert.deepEqual(selected.args,row.args);
  if(row.args.mode==='usage')continue;
  const index=row.args.plotIndex===null?undefined:Number(row.args.plotIndex);
  const op=selected.operation.slice(5);const careAction=op==='water'||op==='worm'||op==='weed'?op:undefined;
  const command=careAction?'care':op==='harvest'?'harvest':op==='upgrade'?'upgrade':'accelerate';
  const body:CaveCommandInput={action:command,plotIndex:index,...(careAction?{careAction}:{}),...(op==='accelerate'?{accelerator:row.args.accelerator,count:row.args.count===null?undefined:Number(row.args.count)}:{})};
  const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{
   const call=()=>row.args.mode==='preview'?getBackendCaveAccelerationPreview('player',1,index!):executeBackendCaveCommand('player',1,body,{requestId:'test',idempotencyKey:row.state+'-'+n});
   if(row.status===200){const data=await call();assert.deepEqual(data,row.args.mode==='preview'?parseBackendCaveAccelerationPreview(row.body.data):parseBackendCaveCommand(row.body.data));assert.deepEqual(parseRobotCaveAction(row.args.mode==='preview'?{mode:'preview',preview:row.body.data}:{mode:'command',result:row.body.data}),row.args.mode==='preview'?{mode:'preview',preview:data}:{mode:'command',result:data});}else await assert.rejects(call);
  });
  assert.equal(calls.length,1,row.text);assert.equal(new URL(calls[0].url).pathname,row.args.mode==='preview'?`/api/v1/players/1/cave/plots/${index}/acceleration-preview`:'/api/v1/players/1/cave/command');if(row.args.mode!=='preview')assert.deepEqual(JSON.parse(calls[0].data!),JSON.parse(JSON.stringify(body)));
 }
 for(const [word,op] of [['浇灌','water'],['除虫','worm'],['除草','weed'],['收割','harvest']] as const)for(const prefix of ['/','#','＃','!','！',''])for(const index of ['', ' 0',' 0002',' 9007199254740993',' '+ '9'.repeat(400)]){
  const text=prefix+'一键'+word+index;const value=index.trim();assert.equal(caveActionCommand(text).operation,'cave.'+op);assert.deepEqual(caveActionCommand(text).args,{plotIndex:value?String(Number(value)):null});
 }
 for(const text of ['/灵田加速','/灵田加速 0','/灵田加速 1','/灵田加速 1 灵肥 0','/灵田加速 1 小绿瓶 0002','/灵田加速 '+ '9'.repeat(400)+' 小绿瓶 1']){
  const [,raw,item,count]=text.match(/灵田加速\s+(\d+)(?:\s+(灵肥|小绿瓶))?(?:\s+(\d+))?$/)??[];const index=raw?Number(raw):undefined;assert.deepEqual(caveActionCommand(text).args,{mode:!index?'usage':item?'execute':'preview',plotIndex:index!==undefined?String(index):null,accelerator:item?item==='灵肥'?'lingfei':'greenBottle':null,count:count?String(Number(count)):null});
 }
 calls.length=0;await assert.rejects(()=>getBackendCaveAccelerationPreview('player',1,9007199254740992));await assert.rejects(()=>executeBackendCaveCommand('player',1,{action:'accelerate',plotIndex:1,accelerator:'greenBottle',count:Infinity},{requestId:'infinite',idempotencyKey:'infinite'}));assert.equal(calls.length,0);
});
