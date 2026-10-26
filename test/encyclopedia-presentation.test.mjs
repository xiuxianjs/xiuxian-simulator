import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__encyclopediaPresentation = { sent: [] };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as browse} from './src/response/encyclopedia/res.ts';export {default as detail} from './src/response/encyclopedia/detail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'encyclopedia-links', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^@src\/(api|response\/robotBusiness)/ }, () => { throw new Error('public links must not import game APIs'); });
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(text, detail = false, isPrivate = true) {
  state.sent = [];
  const event = { name: 'message.create', UserId: 'unregistered', MessageText: text, isPrivate };
  await framework.run(handlers[detail ? 'detail' : 'browse'], event, () => { throw new Error('unexpected next'); });
  assert.equal(state.sent.length, 1);
  const nodes = flatten(state.sent[0]);
  const buttons = nodes.filter(node => node.type === 'Button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].options.type, 'link');
  const url = new URL(buttons[0].options.data);
  assert.equal(url.origin, 'https://tatian-online.alemonjs.com');
  assert.equal(url.pathname, '/components/encyclopedia');
  return { nodes, url };
}

test('public home, categories and subcategories produce direct native links in groups and private chat', async () => {
  assert.equal((await render('/图鉴')).url.search, '');
  for (const category of ['道具', '材料', '装备', '天工', '功法', '本命', '秘境', '凶兽', '货币']) {
    assert.equal((await render(`#图鉴 ${category}`, false, false)).url.searchParams.get('category'), category);
  }
  const { url } = await render('图鉴 装备 武器');
  assert.equal(url.searchParams.get('subCategory'), '武器');
  assert.equal((await render('/图鉴 本命物')).url.searchParams.get('category'), '本命');
});

test('legacy detail commands link directly to the entry; unsafe IDs and malformed input show usage', async () => {
  const { url } = await render('/图鉴详情 装备 0001', true);
  assert.equal(url.searchParams.get('category'), '装备');
  assert.equal(url.searchParams.get('entryId'), '1');
  for (const text of ['/图鉴详情', '/图鉴详情 装备 0', '/图鉴详情 装备 9007199254740992', '/图鉴详情 未知 1', '/图鉴详情 装备 1 2']) {
    const { nodes, url } = await render(text, true);
    assert.equal(url.search, '');
    assert.ok(nodes.some(node => String(node.value).includes('用法：')));
  }
});

test('old pagination commands open the category with an explicit migration notice', async () => {
  const { nodes, url } = await render('/图鉴 道具 丹药 p2');
  assert.equal(url.searchParams.get('subCategory'), '丹药');
  assert.equal(url.searchParams.has('page'), false);
  assert.ok(nodes.some(node => String(node.value).includes('旧页码参数不再使用')));
});
