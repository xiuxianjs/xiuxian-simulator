import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import { createMarkdownText } from '../node_modules/@alemonjs/qq-bot/lib/format.js';

const state = globalThis.__spiritRootPresentation = {};
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: "export {default as root} from './src/response/spiritRoot/res.ts'; export {default as meditation} from './src/response/meditation/start/res.ts'; export {default as settlement} from './src/response/meditation/end/res.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'presentation', setup(b) {
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /^@src\/(api|utils\/useMessage|response\/(config|robotBusiness|finalBusiness))$/ }, a => ({ path: a.path, namespace: 'presentation' }));
    b.onResolve({ filter: /^[^./]/ }, a => a.path.startsWith('@src/') ? undefined : ({ path: import.meta.resolve(a.path), external: true }));
    b.onLoad({ filter: /.*/, namespace: 'presentation' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const createBackendRequestContext=()=>({});
      export const startBackendMeditation=async()=>{throw new Error('unexpected supplementary request')}; export const settleBackendMeditation=startBackendMeditation;
      export { useMessage } from 'alemonjs';
      export const runRobotBusiness=async(e,op,args,decode)=>{const s=globalThis.__spiritRootPresentation;s.calls.push({op,args});if(s.error)throw new Error(s.error);return{handled:false,data:decode(s.data)}};
      export const loadFinalBusiness=async()=>({handled:false,load:async()=>globalThis.__spiritRootPresentation.data});
    ` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const root = {
  granted: true, title: '金单灵根·下品', quality: 0, qualityName: '下品', cultivation: 45,
  stagePoints: 45, stageTarget: 100, overflow: 0, bonusPercent: 10, nextBonusPercent: 20,
  nextQualityName: '中品', requiredRealmName: '筑基初期', canFeed: true, canPromote: false,
  meditationActive: false, activeMeditationBonusPercent: 0, message: '培养值逐次积累，满值且境界达标后晋品'
};
const herb = { itemId: 1, name: '聚灵草', points: 1, quantity: 100, locked: false, seedName: '聚灵草种', sources: [], sourceDetails: [], seedAvailable: false, seedSources: [] };
async function render(command, data, { handler = 'root', isPrivate = false, error } = {}) {
  Object.assign(state, { data, sent: [], calls: [], error });
  const event = { name: isPrivate ? 'private.message.create' : 'message.create', UserId: 'preview', MessageText: command, isPrivate, uid: 1 };
  await framework.run(handlers[handler], event, () => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.sent.length, 1);
  return state.sent.flatMap(message => message.filter(block => block.type === 'Markdown').map(block => createMarkdownText(block.value))).join('\n');
}

test('root actions follow server eligibility and current-session bonus remains explicit', async () => {
  for (const isPrivate of [true, false]) {
    let text = await render('/灵根', root, { isPrivate });
    assert.ok(text.includes('/灵根材料'));
    assert.ok(!text.includes(root.message));
    text = await render('/灵根', { ...root, canFeed: false, canPromote: true, cultivation: 100, stagePoints: 100 }, { isPrivate });
    assert.ok(text.includes('/灵根晋品 0 100'));
    assert.ok(!text.includes('/灵根材料'));
    text = await render('/灵根', { ...root, quality: 3, stageTarget: 0, canFeed: false }, { isPrivate });
    assert.ok(!text.includes('/灵根材料'));
    text = await render('/灵根', { ...root, meditationActive: true, activeMeditationBonusPercent: 0 }, { isPrivate });
    assert.ok(text.includes('本轮修为 +0% · 下轮 +10%'));
  }
});

test('material pagination reaches every item and source links stay inside the same quote', async () => {
  const materials = Array.from({ length: 7 }, (_, index) => ({ ...herb, itemId: index + 1, name: `灵药${index + 1}`, points: 3 }));
  materials[0] = { ...materials[0], seedAvailable: true, sourceDetails: [{ dungeonId: 8, name: '桃花镇', realmLimit: '筑基及以上' }], seedSources: [] };
  const first = await render('/灵根材料 3', materials);
  const second = await render('/灵根材料 3 2', materials);
  for (let index = 1; index <= 7; index++) {
    assert.equal(first.includes(`灵药${index} ·`) ? 1 : 0, index <= 4 ? 1 : 0);
    assert.equal(second.includes(`灵药${index} ·`) ? 1 : 0, index > 4 ? 1 : 0);
  }
  assert.ok(first.includes('/灵根材料 3 2'));
  assert.ok(second.includes('/灵根材料 3 1'));
  assert.match(first, /> 来源：桃花镇[^\n]*text="\/秘境详情 桃花镇"/);
  assert.ok(first.includes('/灵根培养 1 100'));
  assert.ok(!/配置|服务端|批量输入|其余进入条件/.test(first));
  const locked = await render('/灵根材料', [{ ...herb, locked: true }]);
  assert.ok(!locked.includes('/灵根培养'));
  assert.ok((await render('/灵根材料 5', [herb])).includes('暂无此类灵药'));
});

test('preview displays actual cost, unused quantity and overflow while preserving confirmation guards', async () => {
  const preview = { itemId: 1, itemName: '聚灵草', requested: 100, consumed: 2, pointsAdded: 6, before: 99, after: 105, quality: 0, stageTarget: 100, stageBefore: 99, stageAfter: 100 };
  let text = await render('/灵根培养 1 100', preview);
  assert.ok(text.includes('聚灵草×2'));
  assert.ok(text.includes('余下 98 份不消耗'));
  assert.ok(text.includes('晋品后保留培养值 5'));
  assert.ok(text.includes('/灵根确认培养 1 100 0 99'));
  assert.deepEqual(state.calls, [{ op: 'spirit-root.preview', args: { itemId: 1, quantity: 100 } }]);
  await render('/灵根确认培养 1 100 0 99', { view: root, message: '消耗聚灵草×2，培养值+6' });
  assert.deepEqual(state.calls, [{ op: 'spirit-root.feed', args: { itemId: 1, quantity: 100, expectedQuality: 0, expectedCultivation: 99 } }]);
  text = await render('/灵根培养 1 1', { ...preview, requested: 1, consumed: 1, pointsAdded: 1, before: 45, after: 46, stageBefore: 45, stageAfter: 46 });
  assert.ok(!/余下|保留|满阶段/.test(text));
});

test('missing confirmation arguments never mutate and transport details never reach the bubble', async () => {
  for (const command of ['/灵根确认培养', '/灵根晋品', '/灵根培养 1']) {
    await render(command, root);
    assert.deepEqual(state.calls, []);
  }
  for (const data of [{}, root]) {
    const text = await render('/灵根', data, data === root ? { error: 'SQL connection unavailable' } : {});
    assert.ok(text.includes('服务暂时不可用'));
    assert.ok(!/SQL|不完整/.test(text));
  }
});

test('meditation displays root bonus without requiring a seclusion pass', async () => {
  const text = await render('/闭关', {
    success: true, alreadyMeditating: true, elapsedText: '1小时', qiSoFar: 4, expSoFar: 44,
    maxDurationHours: 24, hasSeclusionPassBonus: false, bonusLines: ['本轮灵根修为+10%']
  }, { handler: 'meditation' });
  assert.ok(text.includes('本轮灵根修为+10%'));
});

test('root-only settlement uses the current bonus list without an empty bullet', async () => {
 const text = await render('/出关', {success:true, qiGained:4,creditedExperience:44,elapsedText:'1小时',totalQi:20,bonusLines:['本轮灵根修为+10%'],rewardNotice:''}, {handler:'settlement'});
 assert.ok(text.includes('本轮灵根修为+10%'));
 assert.ok(text.includes('本轮加成：'));
 assert.ok(!/>\s*·\s*(?:\n|$)/.test(text));
});
