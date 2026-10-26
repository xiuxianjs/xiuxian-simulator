import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { Format } from 'alemonjs';
import { addOptions } from '../src/utils/messageHelper';
import { BattleFormatGui, battleMemoryUrl } from '../src/utils/battleMemoryMessage';

const recordId = 'storyline_ABCDEFGHIJKLMNOPQRSTUVWXYZ';

test('native memory button is added while old battle commands retain their semantics', async t => {
  const backend = t.mock.method(axios, 'create', () => { throw new Error('record links must not request a share'); });
  const inline = addOptions(Format.createMarkdown(), [{ label: '过程', command: '/查看战斗过程 record' }]);
  const old = inline.value.value.find(item => item.type === 'MD.button');
  assert.equal(old?.options?.data, '/查看战斗过程 record');
  assert.notEqual(old?.options?.type, 'link');
  const reply = await BattleFormatGui({ bid: 'sender', bar: false, footer: [
    { label: '查看过程', command: '/查看战斗过程 record' }, { label: '继续挑战', command: '/挑战' }
  ] }, [{ id: recordId }]);
  const buttons = reply.format.value.flatMap(item => item.type === 'BT.group' ? item.value.flatMap(row => row.value) : []);
  const memory = buttons.find(button => button.value === '查看战斗回忆');
  assert.equal(memory?.options?.type, 'link');
  assert.equal(memory?.options?.data, battleMemoryUrl(recordId));
  const url = new URL(battleMemoryUrl(recordId));
  assert.equal(url.pathname, `/components/battle-memory/${recordId}`);
  assert.equal(url.hash, '');
  assert.equal(url.search, '');
  assert.equal(backend.mock.callCount(), 0);
  assert.equal(new URL(battleMemoryUrl('战斗 /?#')).pathname, '/components/battle-memory/%E6%88%98%E6%96%97%20%2F%3F%23');
  assert.ok(JSON.stringify(reply.format.value).includes('/查看战斗过程 record'));
});

test('missing record IDs still send the result and legacy controls', async () => {
  const reply = await BattleFormatGui({ bid: 'sender', bar: false, content: Format.createMarkdown().addText('挑战胜利'),
    footer: [{ label: '过程', command: '/查看战斗过程 record' }] }, [{ id: null }]);
  const raw = JSON.stringify(reply.format.value);
  assert.ok(raw.includes('挑战胜利'));
  assert.ok(raw.includes('/查看战斗过程 record'));
  assert.ok(!raw.includes('components/battle-memory'));
});

test('memory link occupies a row above the five navigation buttons', async () => {
  const reply = await BattleFormatGui({ content: Format.createMarkdown().addText('战报正文') }, [{ id: recordId }]);
  const groups = reply.format.value.filter(item => item.type === 'BT.group');
  assert.equal(groups.length, 1);
  const rows = reply.format.value.flatMap(item => item.type === 'BT.group' ? item.value.filter(row => row.value.length) : []);
  assert.deepEqual(rows.map(row => row.value.map(button => button.value)), [
    ['查看战斗回忆'], ['我', '战', '本', '动', '店']
  ]);
  assert.equal(rows[0].value[0].options?.type, 'link');
  assert.equal(rows[0].value[0].options?.data, battleMemoryUrl(recordId));
});

test('multiple memories use three columns without global navigation', async () => {
  const reply = await BattleFormatGui({ keyboard: [[{ label: '已有操作', command: '/已有操作' }]] },
    Array.from({ length: 6 }, (_, index) => ({ id: `record_${index}`, label: `回忆${index + 1}` })));
  const groups = reply.format.value.filter(item => item.type === 'BT.group');
  assert.equal(groups.length, 1);
  const rows = reply.format.value.flatMap(item => item.type === 'BT.group' ? item.value.filter(row => row.value.length) : []);
  assert.deepEqual(rows.map(row => row.value.map(button => button.value)), [
    ['已有操作'], ['回忆1', '回忆2', '回忆3'], ['回忆4', '回忆5', '回忆6']
  ]);
});
