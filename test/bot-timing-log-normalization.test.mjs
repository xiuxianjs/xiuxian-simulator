import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import util from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {normalizeBotTimingLogs} from '../tools/normalize-bot-timing-logs.mjs';
import {analyzeBotTimings} from '../tools/analyze-bot-timings.mjs';
const send=(extra={})=>({stage:'platform.send',requestId:'req',eventTraceId:'evt',commandKey:'shop.list',durationMs:10,outcome:'fulfilled',spanSequence:1,startedFromEventStartMs:20,elapsedFromEventStartMs:30,...extra});
const native=row=>'[2026-10-02 23:00:00][INFO] '+util.format('[传输耗时]',row)+'\n';
const parsed=x=>x.jsonl.trim()?x.jsonl.trim().split('\n').map(x=>JSON.parse(x)):[];
test('actual installed producer + actual log4js file has complete analyzer parity with captured objects',()=>{
 const source=fs.readFileSync(new URL('./fixtures/bot-timing-native/actual-logger.log',import.meta.url),'utf8');
 const normalized=normalizeBotTimingLogs(source);
 assert.equal(normalized.diagnostics.acceptedInspect,20);assert.equal(normalized.diagnostics.droppedBlocks,0);
 const captured=fs.readFileSync(new URL('./fixtures/bot-timing-native/actual-values.jsonl',import.meta.url),'utf8');
 assert.deepEqual(parsed(normalized),parsed({jsonl:captured}));
 const result=analyzeBotTimings(normalized.jsonl);assert.deepEqual(result,analyzeBotTimings(captured));
 const shop=result.commands.find(x=>x.commandKey==='shop.list');assert.equal(shop.phaseDistributions.entry.samples,2);assert.equal(shop.phaseDistributions.entry.medianMs,12);assert.equal(shop.phaseDistributions.entry.p95Ms,13);
 assert.equal(shop.phaseDistributions.business.samples,3);assert.equal(shop.phaseDistributions['send-attempt'].samples,3);
 assert.ok(result.samples.every(x=>x.missingBoundaries.includes('user-display-not-observable')));
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE-|MessageText|"token"|"receipt"/);
});
test('old JSONL envelopes retained but raw strings/url/token/SDK receipt never retained',()=>{
 const row={...send(),token:'PRIVATE-TOKEN',MessageText:'PRIVATE-MESSAGE',url:'https://secret.test',receipt:{code:4000}};
 const out=normalizeBotTimingLogs([JSON.stringify(row),JSON.stringify({data:row}),JSON.stringify({args:['PRIVATE-LABEL',row]}),'PRIVATE-TEXT'].join('\n'));
 assert.equal(out.diagnostics.acceptedJSON,3);assert.equal(out.diagnostics.ignoredLines,1);assert.doesNotMatch(out.jsonl,/PRIVATE-|url|token|receipt|MessageText/);
 assert.equal(normalizeBotTimingLogs(native(row)).diagnostics.droppedBlocks,1);
});
test('truncated and interleaved inspected blocks drop rather than acquiring another event',()=>{
 const one=native(send());const truncated=one.slice(0,one.lastIndexOf('}'));
 const two=native(send({requestId:'next',eventTraceId:'next-event'}));
 const out=normalizeBotTimingLogs(truncated+'[2026-10-02 23:00:00][WARN] PRIVATE-NOISE\n'+two);
 assert.equal(out.diagnostics.droppedBlocks,1);assert.equal(parsed(out).length,1);assert.equal(parsed(out)[0].requestId,'next');
 assert.equal(normalizeBotTimingLogs(truncated).diagnostics.droppedBlocks,1);
 const lines=one.split('\n');lines.splice(3,0,'[2026-10-02 23:00:00][INFO] unrelated-message');assert.equal(parsed(normalizeBotTimingLogs(lines.join('\n'))).length,0);
});
test('docker physical line timestamps, adjacent records and flat one-line shape work',()=>{
 const text=native(send())+native(send({spanSequence:2,durationMs:0,startedFromEventStartMs:30,elapsedFromEventStartMs:30}));
 assert.equal(parsed(normalizeBotTimingLogs(text.split('\n').map(x=>'2026-10-02T15:00:00.123456789Z '+x).join('\n'))).length,2);
 assert.equal(parsed(normalizeBotTimingLogs("[传输耗时] { stage: 'image.file_load', durationMs: 0, requestId: undefined, outcome: 'fulfilled' }\n")).length,1);
});
test('escaped/nonflat/duplicate/unsafe/oversize input cannot execute or leak',()=>{
 for(const text of ["[传输耗时] { stage: 'platform.send', durationMs: process.exit() }", "[传输耗时] { stage: 'platform.send', durationMs: 1, durationMs: 2 }", "[传输耗时] { stage: 'platform.send', durationMs: 1, requestId: 'PRIVATE RAW' }", "[传输耗时] { stage: 'platform.send', durationMs: 1, commandKey: 'PRIVATE' }", "[传输耗时] { stage: 'platform.send', durationMs: 1, requestId: 'a\\\\b' }", "[传输耗时] { stage: '"+'x'.repeat(16385)+"' }", "[传输耗时] {\n"+'  durationMs: 1,\n'.repeat(70)+'}\n']) {
  const out=normalizeBotTimingLogs(text);assert.equal(out.jsonl,'');assert.ok(out.diagnostics.droppedBlocks>=1);assert.doesNotMatch(JSON.stringify(out),/PRIVATE|process\.exit/);
 }
});
test('CLI roundtrip avoids raw data output and cannot overwrite source',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bot-timing-normalize-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=path.join(dir,'source.log'),target=path.join(dir,'target.jsonl');fs.writeFileSync(source,native(send())+'PRIVATE-TEXT\n');
 const cli=fileURLToPath(new URL('../tools/normalize-bot-timing-logs.mjs',import.meta.url));
 const stdout=execFileSync(process.execPath,[cli,source,target],{encoding:'utf8'});assert.equal(JSON.parse(stdout).acceptedInspect,1);assert.doesNotMatch(stdout,/PRIVATE|requestId/);
 assert.throws(()=>execFileSync(process.execPath,[cli,source,source],{stdio:'pipe'}),error=>{assert.doesNotMatch(String(error.stderr),/PRIVATE/);return true;});assert.match(fs.readFileSync(source,'utf8'),/PRIVATE-TEXT/);
 for(const args of [[],[source],[source,target,'extra']])assert.throws(()=>execFileSync(process.execPath,[cli,...args],{stdio:'pipe'}));
 assert.match(execFileSync(process.execPath,[cli,'--help'],{encoding:'utf8'}),/Usage:/);
});

test('CLI rejects symlink and hardlink aliases without changing raw bytes',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bot-timing-normalize-alias-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=path.join(dir,'raw.log'),symlink=path.join(dir,'sym.jsonl'),hardlink=path.join(dir,'hard.jsonl');
 const raw=native(send())+'PRIVATE-RAW-LOCAL\n';fs.writeFileSync(source,raw);fs.symlinkSync(source,symlink);fs.linkSync(source,hardlink);
 const cli=fileURLToPath(new URL('../tools/normalize-bot-timing-logs.mjs',import.meta.url));
 for(const target of [symlink,hardlink]){
  assert.throws(()=>execFileSync(process.execPath,[cli,source,target],{stdio:'pipe'}),error=>{assert.equal(error.status,1);assert.doesNotMatch(String(error.stderr),/PRIVATE|requestId/);return true;});
  assert.equal(fs.readFileSync(source,'utf8'),raw);assert.equal(fs.readFileSync(target,'utf8'),raw);
 }
});

test('learned-book permission wait remains separate from QQ send after native-log normalization', () => {
 const access = send({commandKey:'skill-books.learned',stage:'presentation.access',durationMs:700,startedFromEventStartMs:1500,elapsedFromEventStartMs:2200});
 const delivered = send({commandKey:'skill-books.learned',spanSequence:2,durationMs:100,startedFromEventStartMs:2200,elapsedFromEventStartMs:2300});
 const normalized = normalizeBotTimingLogs(native(access)+native(delivered));
 assert.equal(parsed(normalized).length,2);
 const out = analyzeBotTimings(normalized.jsonl);
 assert.equal(out.samples.length,1);
 assert.equal(out.samples[0].commandKey,'skill-books.learned');
 assert.equal(out.samples[0].phases['presentation-access'].unionMs,700);
 assert.equal(out.samples[0].phases['send-attempt'].unionMs,100);
 assert.equal(out.samples[0].observedLastSendEndMs,2300);
 assert.equal(out.commands[0].phaseDistributions['presentation-access'].medianMs,700);
});
