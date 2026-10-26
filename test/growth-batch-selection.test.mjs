import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const state = { sent: [], calls: [], allowed: true, autoAllowed: true, failDetail: false };
globalThis.__growthSelectionTest = state;
const shim = `
const state = globalThis.__growthSelectionTest;
const markdown = () => ({ parts: [],
  addText(text) { this.parts.push({ text }); return this; },
  addBold(text) { return this.addText(text); },
  addNewline() { return this; },
  addBlockquote(md) { this.parts.push({ quote: md.parts }); return this; },
  addButton(label, options) { this.parts.push({ label, command: options.data }); return this; }
});
export const Format = { createMarkdown: markdown };
export const logger = { error() {} };
export const onResponse = (_selects, handler) => handler;
export const getCurrentEvent = () => undefined;
export const selects = [];
export const useMessage = () => [{ send: value => state.sent.push(value) }];
export const FormatGui = value => value;
export const createQuoteMarkdown = (lines, buttons) => {
  const md = markdown();
  for (const text of lines) md.addText(text);
  for (const button of buttons) md.addButton(button.label, { data: button.command });
  return md;
};
export const formatSkillBookListItem = () => '功法';
export const formatSkillBookDetail = () => markdown().addText('功法详情');
export const buildFailureMessage = (title, detail) => title + detail;
export const getBackendLearnedBooks = async () => {
  if (state.booksMode === 'failure') throw new Error('read failed');
  return { inUseBooks: [], items: state.booksMode === 'empty' ? [] : [{ id: 42, attributeSummary: '', canHide: true, canReset: true }], total: state.booksMode === 'empty' ? 0 : 1, totalPages: 1, currentPage: 1, proficiencyPoints: 3, canUseFifthLayerFeature: false };
};
export const createBackendRequestContext = () => ({ requestId: 'selection-test', idempotencyKey: 'selection-key' });
export const withBackendRepeatDetection = async (_bid, _uid, _text, message) => message;
export const getBackendRobotIdentity = async () => ({ account: { playerId: 9 } });
export const getBackendAlchemyAccess = async () => ({ canUse: state.allowed, reasonCode: state.allowed ? 'ACCESS_OK' : 'NOT_STARTED' });
export const getBackendAlchemyRecipeCatalog = async () => ({ items: [{ id: 12, name: '真灵丹', canAutoAlchemy: state.autoAllowed }] });
export const getBackendAlchemyRecipeDetail = async () => {
  if (state.failDetail) throw new Error('read failed');
  return { id: 12, name: '真灵丹', gradeName: '一品', isLearned: true, proficiency: 100, isProficiencyComplete: true,
    totalCrafts: 1, successCount: 1, perfectCount: 1, pillItemName: '真灵丹', inferiorPillItemName: null,
    refineTime: 20, refineTimeText: '20秒', refineTimeRange: 1, desc: '', materials: [{ itemName: '灵草', quantity: 3 }, { itemName: '灵果', quantity: 2 }] };
};
export class BackendAPIError extends Error {}
export const writeContext = request => ({ request });
export const requestBackend = async (bid, operation, input) => {
  state.calls.push({ bid, operation, input });
  if (operation === 'post_players_id_alchemy_craft') {
    return { ...input.body, perfectCount: input.body.count, inferiorCount: 0, failedCount: 0, totalExp: 5,
      expShielded: false, lowGradeExp: false, expCapped: false, expJustCapped: false };
  }
  if (operation === 'post_players_id_skill_books_skillBookId_batch_upgrade') {
    return { outcome: 'ok', target: { id: input.path.skillBookId, name: '功法' }, successCount: input.body.upgradeCount,
      totalConsumedExp: 5, totalConsumedSpiritStone: 7, lastUpgradeCount: 2, attributeChanges: [], attributeLines: [],
      stopReason: '', upgradeCount: input.body.upgradeCount, skillBookId: input.path.skillBookId };
  }
  throw new Error('unexpected operation: ' + operation);
};
`;
const mocked = new Set(['alemonjs', '@src/utils/useMessage', '@src/response/config', '@src/utils/messageHelper', '@src/utils/skillBookHelper', '@src/api/bot/learned-books-queries', '@src/api/bot/context', '@src/utils/backendRepeatDetector', '@src/api/bot/identity', '@src/api/bot/alchemy-manual', '@src/api/bot/alchemy-recipe-catalog', '@src/api/bot/alchemy-recipe-detail', '@src/api/bot/client']);
const result = await build({
  stdin: { contents: `export { default as alchemy } from './src/response/alchemy/autoCraft/res.ts'; export { default as upgrade } from './src/response/skillBook/batchUpgrade/res.ts'; export { default as books } from './src/response/skillBook/mySkillBooks/res.ts'; export { default as bookDetail } from './src/response/skillBook/detail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'growth-selection-harness', setup(builder) {
    builder.onResolve({ filter: /^@src\/response-apps\/skillBook\/detail\/app$/ }, () => ({ path: 'detail-app', namespace: 'growth-test' }));
    builder.onResolve({ filter: /.*/ }, args => mocked.has(args.path) || (args.path === './client' && args.importer.includes('/src/api/bot/')) ? { path: 'shim', namespace: 'growth-test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'growth-test' }, args => ({ contents: args.path === 'detail-app' ? `export default async () => ({ code: 'OK', data: { skillBookId: 42, proficiencyPoints: 3, skillBook: { detailDisplay: { visibilityAction: 'HIDE', visibilityLabel: '隐藏', canReset: true } } } });` : shim, loader: 'js' }));
  } }]
});
const { alchemy, upgrade, books, bookDetail } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const event = text => ({ UserId: 'player', uid: 9, MessageText: text, isPrivate: false });
const parts = md => md.parts.flatMap(part => part.quote ? parts({ parts: part.quote }) : [part]);
const reset = () => { state.sent.length = 0; state.calls.length = 0; state.allowed = true; state.autoAllowed = true; state.failDetail = false; state.booksMode = 'ready'; };

test('alchemy selection reads materials and offers exact totals without settlement', async () => {
  reset();
  await alchemy(event('/一键炼丹 真灵丹 选择'));
  assert.equal(state.calls.length, 0);
  const quotes = state.sent[0].content.parts.filter(part => part.quote);
  assert.equal(quotes.length, 3);
  for (const [index, count] of [1, 5, 10].entries()) {
    assert.deepEqual(quotes[index].quote.filter(part => part.text).map(part => part.text), [`炼制${count}次`, `灵草 × ${3 * count}`, `灵果 × ${2 * count}`]);
    assert.equal(quotes[index].quote.at(-1).command, `/一键炼丹 真灵丹 ${count}`);
  }
});

test('unavailable recipe or failed material read never offers settlement buttons', async () => {
  for (const field of ['allowed', 'autoAllowed', 'failDetail']) {
    reset();
    state[field] = field === 'failDetail';
    await alchemy(event('/一键炼丹 真灵丹 选择'));
    assert.equal(state.calls.length, 0);
    assert.equal(parts(state.sent[0].content).filter(part => part.command).length, 0);
  }
});

test('upgrade selection offers bounded count choices without a write', async () => {
  reset();
  await upgrade(event('/升级功法 42 选择'));
  assert.equal(state.calls.length, 0);
  assert.deepEqual(state.sent[0].footer.slice(0, 3).map(button => button.command), [1, 5, 10].map(count => `/升级功法 42 ${count}`));
});

test('book list only exposes detail and continuous upgrade for each learned book', async () => {
  reset();
  await books(event('/我的功法'));
  const quote = state.sent[0].content.parts.find(part => part.quote?.some(item => item.command === '/查看功法 42'));
  assert.deepEqual(quote.quote.filter(part => part.command).map(part => part.command), ['/查看功法 42', '/升级功法 42 选择']);
  assert.equal(state.calls.length, 0);
});

test('book detail retains single upgrade, reword, hide and reset entry points', async () => {
  reset();
  await bookDetail(event('/查看功法 42'));
  assert.deepEqual(state.sent[0].footer.map(button => button.command), ['/我的功法', '/升级功法 42', '/换词 42', '/隐藏功法 42', '/重制功法 42']);
  assert.equal(state.calls.length, 0);
});

test('empty or failed book list links to real inventory rather than placeholder learning command', async () => {
  for (const mode of ['empty', 'failure']) {
    reset();
    state.booksMode = mode;
    await books(event('/我的功法'));
    assert.deepEqual(state.sent[0].footer.map(button => button.command), ['/一键学习功法', '/储物袋 功法']);
  }
});

test('explicit actions retain original single API call, chosen target/count and message context', async () => {
  for (const count of [1, 5, 10]) {
    reset();
    await alchemy(event(`/一键炼丹 真灵丹 ${count}`));
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].operation, 'post_players_id_alchemy_craft');
    assert.deepEqual(state.calls[0].input.path, { id: 9 });
    assert.deepEqual(state.calls[0].input.body, { recipeName: '真灵丹', count });
    assert.equal(state.calls[0].input.request.idempotencyKey, 'selection-key');

    reset();
    await upgrade(event(`/升级功法 42 ${count}`));
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].operation, 'post_players_id_skill_books_skillBookId_batch_upgrade');
    assert.deepEqual(state.calls[0].input.path, { id: 9, skillBookId: 42 });
    assert.deepEqual(state.calls[0].input.body, { upgradeCount: count });
    assert.equal(state.calls[0].input.request.idempotencyKey, 'selection-key');
  }
});
