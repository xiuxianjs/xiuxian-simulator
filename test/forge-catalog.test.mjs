import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseForgeCatalogArguments, forgeRecipesForFilter, forgeCatalogCommand } from '../src/response/profession/forge/catalog.ts';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/forge-contracts.json', import.meta.url), 'utf8'));

test('catalog arguments retain numeric pages and preserve explicit filters', () => {
  for (const [args, expected] of [
    [[], { filter: '全部', page: 1 }], [['2'], { filter: '全部', page: 2 }],
    [['全部'], { filter: '全部', page: 1 }], [['考核'], { filter: '考核', page: 1 }],
    [['可制作', '2'], { filter: '可制作', page: 2 }], [['考核', '3'], { filter: '考核', page: 3 }]
  ]) {
    assert.deepEqual(parseForgeCatalogArguments(args), expected);
    const commandArgs = forgeCatalogCommand(expected).split(' ').slice(1);
    assert.deepEqual(parseForgeCatalogArguments(commandArgs), expected);
  }
  for (const args of [['0'], ['-1'], ['1.5'], ['2e1'], ['未知'], ['考核', '0'], ['考核', '1', '2'], ['9007199254740992']]) {
    assert.equal(parseForgeCatalogArguments(args), null, args.join(' '));
  }
});

test('assessment selection is stage-specific and ready selection follows service eligibility', () => {
  const data = structuredClone(fixture.overview);
  const base = data.recipes[0];
  data.recipes = [
    { ...base, id: 1, assessment: true, completed: false, requiredLevel: data.level, canCraft: false },
    { ...base, id: 2, assessment: true, completed: true, requiredLevel: data.level, canCraft: true },
    { ...base, id: 3, assessment: true, completed: false, requiredLevel: data.level + 1, canCraft: false },
    { ...base, id: 4, assessment: false, completed: false, requiredLevel: data.level, canCraft: true }
  ];
  assert.deepEqual(forgeRecipesForFilter(data, '考核').map(r => r.id), [1]);
  assert.deepEqual(forgeRecipesForFilter(data, '可制作').map(r => r.id), [2, 4]);
  assert.equal(forgeRecipesForFilter(data, '全部'), data.recipes);
  data.joined = false;
  assert.deepEqual(forgeRecipesForFilter(data, '考核'), []);
});
