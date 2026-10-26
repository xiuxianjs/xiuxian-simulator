import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: "export {sendSelfCavePlotPage} from './src/response/cavePlot/render.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'capture-cave-render', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/utils\/messageHelper$/ }, () => ({ path: 'messageHelper', namespace: 'capture' }));
    builder.onLoad({ filter: /.*/, namespace: 'capture' }, () => ({ contents: 'export const FormatGui = p => ({...p, content:p.content.value});' }));
  } }]
});
const { sendSelfCavePlotPage } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function buttons(value) {
  if (!value || typeof value !== 'object') return [];
  return [ ...(value.type === 'MD.button' ? [value] : []), ...Object.values(value).flatMap(buttons) ];
}

for (const isPrivate of [false, true]) {
  test(`growing crop keeps acceleration in main cave bubble (${isPrivate ? 'private' : 'group'})`, () => {
    const sent = [];
    sendSelfCavePlotPage({ title: '洞府灵田', bid: 'player', isPrivate, message: { send: p => sent.push(p) }, plots: [
      { plotIndex: 1, plotState: 'cultivated', title: '聚灵草', detail: '缺水，剩余3小时', actions: [
        { label: '浇灌', command: '/浇灌 1' }, { label: '加速', command: '/灵田加速 1' }, { label: '升级', command: '/升级灵田 1' }
      ] },
      { plotIndex: 2, plotState: 'cultivated', title: '已成熟', detail: '可收割', actions: [{ label: '收割', command: '/收割 2' }] },
      { plotIndex: 3, plotState: 'cultivated', title: '空闲', detail: '可播种', actions: [{ label: '播种', command: '/播种 3' }] }
    ] });
    assert.equal(sent.length, 1);
    const shown = buttons(sent[0].content);
    assert.equal(shown.filter(b => b.options.data === '/灵田加速 1').length, 1);
    assert.ok(shown.some(b => b.options.data === '/浇灌 1'));
    assert.ok(shown.some(b => b.options.data === '/收割 2'));
    assert.ok(shown.some(b => b.options.data === '/播种 3'));
    assert.ok(!shown.some(b => b.options.data === '/升级灵田 1'));
    assert.ok(!shown.some(b => /^\/灵田加速 [23]$/.test(b.options.data)));
  });
}
