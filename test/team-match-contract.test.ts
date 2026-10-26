import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import statusApp from '../src/response-apps/teamMatch/status/app';
import cancelApp from '../src/response-apps/teamMatch/cancel/app';
import mainlineApp from '../src/response-apps/teamMatch/startMainline/app';
import dungeonApp from '../src/response-apps/teamMatch/startDungeon/app';
import { parseBackendTeamMatchSnapshot } from '../src/api/bot/team-match-queries';
import { parseBackendTeamMatchCancel } from '../src/api/bot/team-match-cancel';
import { parseBackendTeamMatchStart } from '../src/api/bot/team-match-start';

test('original v1 match Apps preserve request paths and domain DTOs after pure parser extraction', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotBusinessTeamMatch', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const receipts = [...output.matchAll(/ROBOT_TEAM_MATCH_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
  mockBackendConfig(t, { api_url: 'https://match-contract.test', robot_auth_token: 'test-token' });
  let status = 200; let payload: unknown;
  const calls: { url: string; method: string; data?: string }[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (call: { url: string; method: string; data?: string }) => {
    calls.push(call);
    return { status, headers: {}, data: JSON.stringify(status < 400 ? { data: payload } : { error: { code: 'CONFLICT', message: '原匹配拒绝' } }) };
  } }));
  const request = { requestId: 'match-contract', idempotencyKey: 'match-contract' };
  const strategies = { WAITING:'等待同目标修士进入匹配池', SAME_REALM:'仅匹配同大境界修士', ADJACENT_REALM:'优先同大境界，其次相邻大境界', NEAREST_REALM:'放宽到同目标副本的最近大境界修士' };
  for (const row of receipts.filter(r => r.result.success && r.result.branch === 'business')) {
    payload = row.result.data; calls.length = 0;
    if (row.op === 'team-match.snapshot') {
      status = 200; const dto = parseBackendTeamMatchSnapshot(payload);
      assert.deepEqual(await statusApp({bid:'player'}), dto === null ? {code:'NO_MATCH'} : {code:'OK', data:{targetLabel:dto.targetLabel,waitedSeconds:dto.waitedSeconds,timeoutSeconds:dto.timeoutSeconds,strategyText:strategies[dto.phase]}});
      assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['GET','/api/v1/teams/match/snapshot']]);
    } else if (row.op === 'team-match.cancel') {
      status = 200; const dto = parseBackendTeamMatchCancel(payload);
      assert.deepEqual(await cancelApp({bid:'player',uid:1,request}),dto.cancelled?{code:'OK',data:{targetLabel:dto.targetLabel}}:{code:'NO_MATCH'});
      assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['POST','/api/v1/teams/match/cancel']]);
    } else {
      status = 201; const mainline = row.op === 'team-match.start-mainline';
      assert.deepEqual(mainline ? await mainlineApp({bid:'player',chapterNumber:7,stageNumber:3,request}) : await dungeonApp({bid:'player',dungeonId:5,request}),{code:'OK',data:parseBackendTeamMatchStart(payload)});
      assert.deepEqual(calls.map(c=>[c.method.toUpperCase(),new URL(c.url).pathname]),[['POST','/api/v1/teams/match']]);
      assert.deepEqual(JSON.parse(calls[0].data!), mainline ? {mode:'mainline',chapterNumber:7,stageNumber:3} : {mode:'dungeon',targetId:5});
    }
  }
  status = 409;
  for (const invoke of [()=>statusApp({bid:'player'}),()=>cancelApp({bid:'player',uid:1,request}),()=>mainlineApp({bid:'player',chapterNumber:7,stageNumber:3,request}),()=>dungeonApp({bid:'player',dungeonId:5,request})]) {
    calls.length=0;assert.deepEqual(await invoke(),{code:'LOAD_FAILED',data:{message:'原匹配拒绝'}});assert.equal(calls.length,1);
  }
});
