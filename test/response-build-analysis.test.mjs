import assert from 'node:assert/strict';
import {test} from 'node:test';
import util from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {normalizeBotTimingLogs} from '../tools/normalize-bot-timing-logs.mjs';
import {analyzeBotTimings} from '../tools/analyze-bot-timings.mjs';
const span=(stage,sequence,start,end,extra={})=>({requestId:'request',eventTraceId:'event',commandKey:'shop.list',stage,spanSequence:sequence,durationMs:end-start,startedFromEventStartMs:start,elapsedFromEventStartMs:end,outcome:'fulfilled',...extra});
const analyze=rows=>analyzeBotTimings(rows.map(row=>JSON.stringify(row)).join('\n'));

test('build spans survive native logger normalization and analyzer fields, distributions and candidates',()=>{
 const rows=[span('response.build',1,10,40),span('response.build',2,30,60),span('platform.send',3,60,70)];
 const native=rows.map(row=>'[2026-10-03 08:00:00][INFO] '+util.format('[传输耗时]',row)).join('\n');
 const normalized=normalizeBotTimingLogs(native);
 assert.equal(normalized.diagnostics.acceptedInspect,3);assert.equal(normalized.diagnostics.droppedBlocks,0);
 assert.deepEqual(normalized.jsonl.trim().split('\n').map(x=>JSON.parse(x)),rows);
 const out=analyzeBotTimings(normalized.jsonl),sample=out.samples[0],command=out.commands[0];
 assert.deepEqual(out,analyze(rows));assert.equal(out.diagnostics.ignoredLines,0);
 assert.equal(sample.timeline[0].stage,'response.build');assert.equal(sample.timeline[0].phase,'response-build');
 assert.equal(sample.phases['response-build'].observedSpanCount,2);assert.equal(sample.phases['response-build'].unionMs,50);
 assert.equal(sample.phases['response-build'].observedSendWindowUnionMs,50);
 assert.equal(sample.measuredWindowUnionMs,60);assert.equal(sample.observedLastSendEndMs,70);assert.deepEqual(sample.unloggedIntervalsMs,[[0,10]]);
 assert.equal(sample.largestObservedIndependentPhase,'response-build');assert.equal(sample.largestObservedSendWindowPhase,'response-build');
 assert.equal(command.phaseDistributions['response-build'].medianMs,50);assert.equal(command.phaseDistributions['response-build'].p95Ms,50);
 assert.equal(command.observedSendWindowPhaseDistributions['response-build'].medianMs,50);
 assert.deepEqual(command.observedBottleneckCandidates,{'response-build':1});assert.deepEqual(command.observedSendWindowBottleneckCandidates,{'response-build':1});
});

test('build overlap and tail clip before union without changing the send boundary',()=>{
 const sample=analyze([span('response.build',1,10,100),span('response.build',2,20,80),span('image.render',3,10,40),span('platform.send',4,50,60)]).samples[0];
 assert.equal(sample.phases['response-build'].unionMs,90);assert.equal(sample.phases['response-build'].observedSendWindowUnionMs,50);
 assert.equal(sample.observedLastSendEndMs,60);assert.equal(sample.measuredWindowUnionMs,50);
 assert.equal(sample.phases['send-attempt'].observedSpanCount,1);assert.notEqual(Object.values(sample.phases).reduce((total,x)=>total+(x.observedSendWindowUnionMs??0),0),sample.measuredWindowUnionMs);
 const tail=analyze([span('platform.send',1,20,30),span('response.build',2,40,100)]).samples[0];
 assert.equal(tail.observedLastSendEndMs,30);assert.equal(tail.phases['response-build'].unionMs,60);assert.equal(tail.phases['response-build'].observedSendWindowUnionMs,0);assert.equal(tail.largestObservedSendWindowPhase,'send-attempt');
});

test('failed/build-only/unlocated/duplicate spans retain conservative endpoint and failure semantics',()=>{
 const build=span('response.build',1,10,20,{outcome:'rejected'});
 const noSend=analyze([build]).samples[0];assert.equal(noSend.observedLastSendEndMs,null);assert.equal(noSend.sendState,'send-completion-not-observed');assert.equal(noSend.stageFailureObserved,true);assert.equal(noSend.phases['send-attempt'].observedSpanCount,0);
 const duplicate=analyze([build,build,span('platform.send',2,20,30)]);assert.equal(duplicate.diagnostics.duplicateSpans,1);assert.equal(duplicate.samples[0].phases['response-build'].observedSpanCount,1);assert.match(duplicate.samples[0].sendState,/fulfilled-receipt/);assert.equal(duplicate.commands[0].observedStageFailure.samples,1);
 const unlocated=analyze([span('response.build',1,10,20,{startedFromEventStartMs:undefined,elapsedFromEventStartMs:undefined}),span('platform.send',2,20,30)]);
 assert.equal(unlocated.samples[0].observedLastSendEndMs,null);assert.equal(unlocated.samples[0].phases['response-build'].unionMs,null);assert.equal(unlocated.samples[0].phases['response-build'].observedSpanCount,1);
});

test('CLI normalization and JSON report preserve build phase while dropping private payload',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'response-build-analysis-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const input=path.join(dir,'input.log'),normalized=path.join(dir,'timing.jsonl'),output=path.join(dir,'report.json');
 fs.writeFileSync(input,[span('response.build',1,10,20,{message:'PRIVATE-MESSAGE',token:'PRIVATE-TOKEN'}),span('platform.send',2,20,30)].map(x=>JSON.stringify(x)).join('\n'));
 execFileSync(process.execPath,['tools/normalize-bot-timing-logs.mjs',input,normalized]);
 execFileSync(process.execPath,['tools/analyze-bot-timings.mjs',normalized,output]);
 const text=fs.readFileSync(output,'utf8'),out=JSON.parse(text);assert.doesNotMatch(text,/PRIVATE-/);assert.equal(out.samples[0].phases['response-build'].unionMs,10);assert.equal(out.commands[0].phaseDistributions['response-build'].samples,1);assert.equal(out.samples[0].observedLastSendEndMs,30);
});
