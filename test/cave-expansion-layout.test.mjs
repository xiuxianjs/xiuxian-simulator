import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/response/cavePlot/pagination.ts'; export { sendSelfCavePlotPage } from './src/response/cavePlot/render.ts';`,
    resolveDir: process.cwd()
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'cave-expansion', setup(b) {
    b.onResolve({ filter: /^@src\/constants$/ }, () => ({ path: resolve('src/constants/common.ts') }));
    b.onResolve({ filter: /^@src\/utils\/messageHelper$/ }, () => ({ path: 'messageHelper', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const FormatGui = value => value;' }));
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
  } }]
});
const { paginateCaveItems, cavePageForPlot, sendSelfCavePlotPage } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const plots = Array.from({ length: 32 }, (_, index) => ({
  plotIndex: index + 1, plotState: 'cultivated', title: '空闲灵田', detail: '可播种。',
  actions: [{ label: '播种', command: `/播种 ${index + 1}` }]
}));

test('32块田分页能完整到达31、32号，详情定位与末页一致', () => {
  const page = paginateCaveItems(plots, 999, '/我的灵田 页 {page}');
  assert.equal(page.nav.current, 7);
  assert.equal(page.nav.total, 7);
  assert.deepEqual(page.items.map(plot => plot.plotIndex), [31, 32]);
  assert.equal(cavePageForPlot(plots, 32), 7);
});

test('末页气泡只展示最后两块田并保留对应动作', () => {
  const sent = [];
  sendSelfCavePlotPage({ title: '洞府灵田', bid: 'one', isPrivate: true, plots, page: 7, message: { send: value => sent.push(value) } });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].nav.total, 7);
  const text = JSON.stringify(sent[0].content.value);
  assert.match(text, /【31】/);
  assert.match(text, /【32】/);
  assert.match(text, /播种 32/);
  assert.doesNotMatch(text, /【30】/);
});
