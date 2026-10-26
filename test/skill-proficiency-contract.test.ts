import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {useBackendSkillBookProficiency} from '../src/api/bot/skill-book-proficiency';
import {BackendAPIError} from '../src/api/bot/client';

test('proficiency original SDK preserves positive fractions, all, omitted zero defaults and write identity',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessSkillProficiencyV1ParityAndReplay$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
 const rows=[...output.matchAll(/ROBOT_SKILL_PROFICIENCY=(.+)/g)].map(m=>JSON.parse(m[1])).filter(r=>r.status!==0);assert.equal(rows.length,119);
 mockBackendConfig(t,{api_url:'https://skill-proficiency.test',robot_auth_token:'local-test'});
 let row:typeof rows[number];const calls:Array<{url:string;method:string;data?:string;headers:Record<string,string>}>=[];
 t.mock.method(axios,'create',()=>({request:async(call:typeof calls[number])=>{calls.push(call);return{status:row.status,headers:{},data:JSON.stringify(row.v1)}}}));
 for(let i=0;i<rows.length;i++){
  row=rows[i];calls.length=0;const request={requestId:'proficiency-'+i,idempotencyKey:'proficiency-'+i};const tokens=row.arguments.tokens;const last=tokens.at(-1);const all=last==='全部'||last==='所有';const identifier=tokens.slice(0,-1).join(' ');
  const invoke=()=>useBackendSkillBookProficiency('player',1,identifier,all?'全部':Number(last),request);
  if(row.status!==200)await assert.rejects(invoke,error=>error instanceof BackendAPIError&&error.message===row.v1.error.message);
  else{
   const expected={...row.v1.data};
   if(expected.outcome==='ok'){
    for(const key of ['oldProficiency','newProficiency','remainingPoints','successCount','failCount'])expected[key]??=0;
    expected.skillBookName??='';expected.pityTriggered??=false;
   }
   if(expected.outcome==='insufficient_points')expected.currentPoints??=0;
   assert.deepEqual(await invoke(),expected);
  }
  assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).pathname,'/api/v1/players/1/skill-books/proficiency');assert.equal(calls[0].method.toUpperCase(),'POST');assert.deepEqual(JSON.parse(calls[0].data!),all?{identifier,all}:{identifier,all,points:Number(last)});
  const header=(name:string)=>Object.entries(calls[0].headers).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];
  assert.equal(header('Authorization'),'Bearer local-test');assert.equal(header('X-Bid'),'player');assert.equal(header('Idempotency-Key'),request.idempotencyKey);assert.equal(header('X-Repeat-Command'),undefined);
 }
});
