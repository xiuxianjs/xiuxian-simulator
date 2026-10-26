import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { format } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeBotTimingLogs } from '../tools/normalize-bot-timing-logs.mjs';
import { analyzeBotTimings } from '../tools/analyze-bot-timings.mjs';

const span=(eventTraceId,end,eventKind,extra={})=>({requestId:'same-authority',eventTraceId,commandKey:'shop.list',stage:'platform.send',spanSequence:1,durationMs:10,startedFromEventStartMs:end-10,elapsedFromEventStartMs:end,outcome:'fulfilled',...(eventKind===undefined?{}:{eventKind}),...extra});
const analyze=rows=>analyzeBotTimings(rows.map(x=>JSON.stringify(x)).join('\n'));
test('actual FormatEvent producer preserves request identity and logs only fixed event kind',()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;delete env.BROWSER_ENV;
 execFileSync(process.execPath,['--import','tsx','--test','--test-force-exit',fileURLToPath(new URL('./fixtures/bot-event-kind-producer-harness.ts',import.meta.url))],{cwd:fileURLToPath(new URL('..',import.meta.url)),env,stdio:'pipe'});
});
test('native inspect normalization retains kind and separates endpoint statistics by command and kind',()=>{
 const rows=[span('m1',20,'message'),span('m2',40,'message'),span('i1',100,'interaction'),span('old',60),span('mainline',70,'interaction',{commandKey:'storyline.list'})];
 const native=rows.map(x=>format('[传输耗时]',x)).join('\n');const normalized=normalizeBotTimingLogs(native);
 const out=analyzeBotTimings(normalized.jsonl);assert.equal(out.samples.length,5);
 const c=out.commands.find(x=>x.commandKey==='shop.list');
 assert.deepEqual(c.endpointStatsByEventKind.message,{samples:2,medianMs:30,p95Ms:40,correlatedEvents:2,excludedFromEndpointStats:0});
 assert.equal(c.endpointStatsByEventKind.interaction.medianMs,100);assert.equal(c.endpointStatsByEventKind.unknown.medianMs,60);
 assert.equal(c.processorToObservedLastSendAttemptEnd.medianMs,50);
 assert.equal(out.commands.find(x=>x.commandKey==='storyline.list').endpointStatsByEventKind.interaction.medianMs,70);
 assert.equal(out.samples.find(x=>x.eventTraceId==='old').eventKind,'unknown');
 assert.equal(out.samples.find(x=>x.eventTraceId==='m1').measuredWindowUnionMs,10);
});
test('unknown kind adds no conflicting information and duplicate spans cannot hide a real conflict',()=>{
 const partial=analyze([span('partial',20),span('partial',40,'message',{spanSequence:2})]);
 assert.equal(partial.samples[0].eventKind,'message');assert.equal(partial.samples[0].ambiguousEventKind,false);assert.equal(partial.samples[0].observedLastSendEndMs,40);
 const conflict=analyze([span('conflict',20,'message'),span('conflict',20,'interaction')]);
 assert.equal(conflict.diagnostics.duplicateSpans,1);assert.equal(conflict.samples[0].eventKind,'unknown');assert.equal(conflict.samples[0].ambiguousEventKind,true);
 assert.equal(conflict.samples[0].observedLastSendEndMs,null);assert.ok(conflict.samples[0].missingBoundaries.includes('conflicting-event-kind'));
 assert.equal(conflict.commands[0].processorToObservedLastSendAttemptEnd.samples,0);assert.equal(conflict.commands[0].endpointStatsByEventKind.unknown.excludedFromEndpointStats,1);
});
test('illegal kind values and raw event fields cannot enter normalized or analyzed output',()=>{
 for(const eventKind of ['PRIVATE-ID',null,42,{value:'PRIVATE-DATA'},['PRIVATE-DATA']]){
  const input=span('unsafe',20,eventKind,{InteractionId:'PRIVATE-ID',value:{timestamp:'PRIVATE-TIME'},Interaction:{data:'PRIVATE-BODY'}});
  const direct=analyze([input]);assert.equal(direct.samples[0].eventKind,'unknown');assert.doesNotMatch(JSON.stringify(direct),/PRIVATE|timestamp|InteractionId/);
  const normalized=normalizeBotTimingLogs(JSON.stringify(input));assert.doesNotMatch(JSON.stringify(normalized),/PRIVATE|timestamp|InteractionId/);
  if(normalized.jsonl){const parsed=analyzeBotTimings(normalized.jsonl);assert.equal(parsed.samples[0].eventKind,'unknown')}
 }
});

 test('CLI normalization and analysis retain only fixed kinds and independent endpoint summaries',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bot-event-kind-cli-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const raw=path.join(dir,'input.log'),normalized=path.join(dir,'timings.jsonl'),report=path.join(dir,'report.json');
  fs.writeFileSync(raw,[span('message',20,'message'),span('interaction',50,'interaction'),span('legacy',30)].map(x=>format('[传输耗时]',x)).join('\n')+'\nPRIVATE-RAW-TAIL\n');
  execFileSync(process.execPath,[fileURLToPath(new URL('../tools/normalize-bot-timing-logs.mjs',import.meta.url)),raw,normalized],{stdio:'pipe'});
  execFileSync(process.execPath,[fileURLToPath(new URL('../tools/analyze-bot-timings.mjs',import.meta.url)),normalized,report],{stdio:'pipe'});
  const output=fs.readFileSync(report,'utf8');assert.doesNotMatch(output,/PRIVATE/);
  const out=JSON.parse(output);assert.deepEqual(out.samples.map(x=>x.eventKind),['message','interaction','unknown']);
  assert.equal(out.commands[0].endpointStatsByEventKind.message.medianMs,20);assert.equal(out.commands[0].endpointStatsByEventKind.interaction.medianMs,50);assert.equal(out.commands[0].endpointStatsByEventKind.unknown.medianMs,30);
 });
