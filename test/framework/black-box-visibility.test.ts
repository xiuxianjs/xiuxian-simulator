import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router, ResultCode, shutdownLogger } from 'alemonjs';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { businessEnvelope, gameFixture } from './fixture';

let scratch:string;
let frames:Record<string,unknown>;
let clickFrames:Record<string,unknown>;
before(()=>{
 scratch=mkdtempSync(join(tmpdir(),'black-box-bot-contracts-'));
 try { goTestFixture(['test','./internal/httpapi','-run','^TestBlackBoxHTTP','-count=1'],{cwd:fileURLToPath(new URL('../../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',env:{...process.env,BLACK_BOX_HTTP_CONTRACT_OUTPUT:join(scratch,'black-box-contracts.json')},maxBuffer:4*1024*1024}); } catch (error) { const failure=error as {stdout?:Buffer;stderr?:Buffer}; throw Error(`${failure.stdout?.toString()??''}${failure.stderr?.toString()??''}`); }
 frames=JSON.parse(readFileSync(join(scratch,'black-box-contracts.json'),'utf8'));
 clickFrames=JSON.parse(readFileSync(join(scratch,'black-box-click-window-contract.json'),'utf8'));
 mock.timers.enable({apis:['setTimeout']});
});
after(async()=>{mock.timers.reset();if(scratch)rmSync(scratch,{recursive:true,force:true});await shutdownLogger();});
async function mountBlackBox(app: Awaited<ReturnType<typeof gameFixture>>['app']) {
 const router=Router.create({events:['message.create','private.message.create']});
 router.use(['黑盒拍卖', '限时活动', '查看特殊活动'], () => import('@src/response/blackBox/overview/res'));
 router.use('黑盒排期', () => import('@src/response/blackBox/schedule/res'));
 router.use('黑盒记录', () => import('@src/response/blackBox/history/res'));
 router.use('黑盒详情', () => import('@src/response/blackBox/room/res'));
 router.use('黑盒出价', () => import('@src/response/blackBox/preview/res'));
 router.use('黑盒入场', () => import('@src/response/blackBox/join/res'));
 router.use(['黑盒提醒', '黑盒预约'], () => import('@src/response/blackBox/reserve/res'));
 router.use('黑盒确认', () => import('@src/response/blackBox/confirm/res'));
 router.use('黑盒取消', () => import('@src/response/blackBox/cancel/res'));
 router.use('黑盒鉴宝', () => import('@src/response/blackBox/probe/res'));
 router.use('确认黑盒出价', () => import('@src/response/blackBox/bid/res'));
 router.use('黑盒撤标', () => import('@src/response/blackBox/withdraw/res'));
 await app.mount({responseRouter:router.define});
}
test('启用真实服务端功能过滤后，首页排期及入场提醒取消按钮完整可达', async t => {
 const output=goTestFixture(['test','./internal/service','-run','^TestTianshuPresentationCommandBoundaryFixture$','-v','-count=1'], {
  cwd:fileURLToPath(new URL('../../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024
 });
 const rows=[...output.matchAll(/TIANSHU_PRESENTATION_BOUNDARY=(.+)/g)].map(match=>JSON.parse(match[1]));
 const content=rows.find(row=>row.level===2).content;
 for(const command of ['黑盒排期','黑盒入场','黑盒提醒'])assert.equal(content.commandFeatures[command],'black-box');
 assert.equal(content.commandFeatures['黑盒取消'],'maintenance');
 let current=frames.overviewSubmitted;
 const f=await gameFixture(t,r=>r.path.includes('/business/')?businessEnvelope(r.bid,current):content);
 await mountBlackBox(f.app);
 await f.app.invoke(f.app.events.privateMessage(),startFeatureVisibility);
 for(const [command,data,button] of [
  ['/黑盒拍卖',frames.overviewSubmitted,'/黑盒排期'],
  ['/黑盒排期',frames.overviewSubmitted,'/黑盒拍卖'],
  ['/黑盒排期 12',clickFrames.overviewBefore,'/黑盒提醒 1 D01-1200-C'],
  ['/黑盒排期 12',clickFrames.overviewOpen,'/黑盒入场 1 D01-1200-C'],
  ['/黑盒记录',clickFrames.historyWaiting,'/黑盒取消 1 D01-1200-C'],
  ['/黑盒记录',clickFrames.historyStarted,'/黑盒详情 1 D01-1200-C'],
  ['/黑盒详情 1 D01-1200-C',clickFrames.roomBidding,'/黑盒出价 1 D01-1200-C 800'],
  ['/黑盒出价 1 D01-1200-C 800',{room:clickFrames.roomBidding,amount:800},'/确认黑盒出价 1 D01-1200-C 800']
 ] as const){
  current=data;
  const result=await f.app.dispatch(f.app.events.privateMessage({text:command,platform:'qq-bot'}));
  assert.equal(result.messages.length,1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
  assert.ok(result.messages[0].commands.includes(button),command+' -> '+button);
 }
});
