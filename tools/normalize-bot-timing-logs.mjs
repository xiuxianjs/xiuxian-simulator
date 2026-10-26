import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const stages=new Set(['platform.send','notification.platform.send','image.render','image.upload','image.cache.hit','image.cache.miss','image.cache.join','image.file_load','response.build','route.import','presentation.access']);
const tags=new Set(['storyline.list','shop.list','skill-books.learned','unknown']);
const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(value);
const operation=value=>typeof value==='string'&&(value==='getRobotIdentity'||/^(get|post|put|patch|delete)_[a-zA-Z0-9_]{1,150}$/.test(value));
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const sequence=value=>Number.isSafeInteger(value)&&value>0;
const fields={requestId:safeId,eventTraceId:safeId,commandKey:value=>tags.has(value),eventKind:value=>['message','interaction','unknown'].includes(value),stage:value=>stages.has(value),operationId:operation,durationMs:number,outcome:value=>['fulfilled','rejected','success','error','unknown'].includes(value),requestSequence:sequence,spanSequence:sequence,concurrentRequestsAtStart:number,cumulativeRequestMs:number,startedFromEventStartMs:number,elapsedFromEventStartMs:number,elapsedFromFirstRequestMs:number};
function select(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 if(!stages.has(value.stage)&&!operation(value.operationId))return;
 const out={};
 for(const [key,validate] of Object.entries(fields)){
  if(value[key]===undefined)continue;
  if(!validate(value[key]))return;
  out[key]=value[key];
 }
 if(!number(out.durationMs))return;
 return out;
}
function fromJSON(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 for(const item of [value,value.data,...(Array.isArray(value.args)?value.args:[])]){const out=select(item);if(out)return out;}
}
function inspect(body){
 // Only the current flat scalar logger shape, never JavaScript evaluation.
 // Unknown/duplicate fields and escaped/non-ASCII strings reject the entire block.
 const out={};let rest=body.trim();
 while(rest){
  const match=/^([A-Za-z][A-Za-z0-9]*):\s*(undefined|'[A-Za-z0-9_.:-]*'|[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)(?:\s*,\s*|\s*$)/i.exec(rest);
  if(!match||!Object.hasOwn(fields,match[1])||Object.hasOwn(out,match[1]))return;
  const raw=match[2];out[match[1]]=raw==='undefined'?undefined:raw.startsWith("'")?raw.slice(1,-1):Number(raw);
  rest=rest.slice(match[0].length).trim();
 }
 return select(out);
}
export function normalizeBotTimingLogs(text){
 const rows=[],diagnostics={inputLines:0,acceptedJSON:0,acceptedInspect:0,droppedBlocks:0,ignoredLines:0};
 let pending;
 const abandon=()=>{if(pending){diagnostics.droppedBlocks++;pending=undefined;}};
 for(const raw of text.split(/\r?\n/)){
  if(!raw.trim())continue;diagnostics.inputLines++;
  // docker logs --timestamps prepends each physical line. Other prefixes are not guessed.
  const line=raw.replace(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z\s/,'');
  const header=/^(?:\[\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\])?(?:\[INFO\])?\s*\[(后端请求耗时|传输耗时)\]\s*\{(.*)$/.exec(line);
  if(header){
   abandon();pending={body:'',lines:1,kind:header[1]};
   if(header[2].length>16384){abandon();diagnostics.ignoredLines++;continue;}
   const fragment=header[2];
   if(fragment.trim().endsWith('}')){pending.body=fragment.trim().slice(0,-1);}
   else {pending.body=fragment+'\n';continue;}
  }else if(pending){
   pending.lines++;
   if(pending.lines>64||pending.body.length+line.length>16384){abandon();diagnostics.ignoredLines++;continue;}
   if(line.trim()==='}'){} // exact close only
   else if(/^\s{2}[A-Za-z][A-Za-z0-9]*:\s/.test(line)){pending.body+=line+'\n';continue;}
   else {abandon();} // interleaving never joins the next event into this block
  }
  if(pending){
   const out=inspect(pending.body);
   if(out&&((pending.kind==='后端请求耗时'&&out.operationId&&!out.stage)||(pending.kind==='传输耗时'&&out.stage&&!out.operationId))){rows.push(out);diagnostics.acceptedInspect++;pending=undefined;}
   else abandon();
   continue;
  }
  try {const out=fromJSON(JSON.parse(line));if(out){rows.push(out);diagnostics.acceptedJSON++;continue;}}catch{}
  diagnostics.ignoredLines++;
 }
 abandon();return {jsonl:rows.map(row=>JSON.stringify(row)).join('\n')+(rows.length?'\n':''),diagnostics};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [input,output,...extra]=process.argv.slice(2);
 if(input==='--help'&&!output&&!extra.length)process.stdout.write('Usage: node tools/normalize-bot-timing-logs.mjs INPUT.log OUTPUT.jsonl\nAccepts current flat timing inspect blocks and JSONL; drops incomplete/interleaved/unsupported blocks. Retains timing fields only.\n');
 else if(!input||!output||extra.length){process.stderr.write('Timing normalization failed: expected input and distinct output paths.\n');process.exitCode=1;}
 else try{
  if(path.resolve(input)===path.resolve(output))throw new Error();
  const inputStat=fs.statSync(input);let outputStat;
  try{outputStat=fs.statSync(output);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(outputStat&&inputStat.dev===outputStat.dev&&inputStat.ino===outputStat.ino)throw new Error();
  const result=normalizeBotTimingLogs(fs.readFileSync(input,'utf8'));fs.writeFileSync(output,result.jsonl);process.stdout.write(JSON.stringify(result.diagnostics)+'\n');
 }catch{process.stderr.write('Timing normalization failed: check input and distinct output path.\n');process.exitCode=1;}
}
