import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendTaskPanelView, parseRobotTaskPanel } from '../src/api/bot/task-panel-view';

test('task panel business preserves original selected v1 view and SDK checks', async t => {
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessTaskPanel','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const rows=[...output.matchAll(/ROBOT_TASK_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,54);
 mockBackendConfig(t,{api_url:'https://task-panel.test',robot_auth_token:'local-test'});
 let row=rows[0];const calls:Array<{url:string;method:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(row of rows.filter(r=>r.state==='ready')){
  calls.length=0;
  const old=await getBackendTaskPanelView('player',1,row.tab?{tabKey:row.tab}:{});
  const {requestedTab,...view}=parseRobotTaskPanel(row.result.data);
  assert.equal(requestedTab,row.tab);assert.deepEqual(view,old);
  assert.equal(calls.length,1);const url=new URL(calls[0].url);
  assert.equal(url.pathname,'/api/v1/players/1/task-panel/view');assert.equal(url.searchParams.get('view'),'selected');assert.equal(url.searchParams.get('tab')??'',row.tab);
 }
 for(const value of [null,{}, {view:{},requestedTab:''}, {view:rows[0].v1.data,requestedTab:'BAD'}])assert.throws(()=>parseRobotTaskPanel(value));
});
