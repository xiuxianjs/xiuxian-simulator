import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendNotificationHistory, parseNotificationHistory } from '../src/api/bot/notification-history-queries';

test('notification history original SDK keeps page equality, five-item limit, owner path and delivery text', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessNotificationHistory','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_NOTIFICATION_HISTORY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
 mockBackendConfig(t,{api_url:'https://history.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state!=='muted'&&r.status!==0)){
  calls.length=0;const page=Number(row.arguments.pageText||1);
  if(row.status!==200){await assert.rejects(()=>getBackendNotificationHistory('player',1,page));assert.equal(row.result.success,false)}
  else{const old=await getBackendNotificationHistory('player',1,page);assert.deepEqual(parseNotificationHistory(row.result.data,page),old);assert.ok(old.items.length<=5)}
  if(page>1000000){assert.equal(calls.length,0);continue}
  assert.equal(calls.length,1,row.state+' '+row.text);const call=calls[0],url=new URL(call.url);
  assert.equal(url.pathname,'/api/v1/players/1/notifications');assert.equal(url.searchParams.get('page'),String(page));assert.equal(call.method.toUpperCase(),'GET');
  const header=(name:string)=>Object.entries(call.headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');
 }
 const valid=rows.find(r=>r.state==='ready'&&r.arguments.pageText==='1').v1.data;
 for(const data of [{...valid,page:2},{...valid,items:[...valid.items,valid.items[0]]},{...valid,items:[{...valid.items[0],time:'invalid'}]}]){
  assert.throws(()=>parseNotificationHistory(data,1),{message:'通知记录接口数据不完整'});
 }
});
