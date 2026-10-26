import assert from 'node:assert/strict';

// Validate the intended advice addition before comparing every unchanged node
// against a frozen legacy bubble. Unknown or missing additions must fail.
export function withoutExpectedAdvice(messages, expectations) {
  const copy = structuredClone(messages);
  let found = 0;
  for (const nodes of copy) for (const node of nodes) {
    if (node.type !== 'Markdown') continue;
    const index = node.value.findIndex(child => child.type === 'MD.text' && child.value === '建议：');
    if (index < 0) continue;
    found++;
    assert.ok(expectations.length, 'unexpected advice');
    assert.equal(node.value[index - 1].type, 'MD.newline');
    for (const [offset, expected] of expectations.entries()) {
      assert.equal(node.value[index + 1 + offset * 2].type, 'MD.newline');
      const quote = node.value[index + 2 + offset * 2];
      assert.equal(quote.type, 'MD.blockquote');
      assert.ok(quote.value[0].value.includes(expected.text), quote.value[0].value);
      assert.deepEqual(quote.value.filter(child => child.type === 'MD.button').map(child => child.options.data), [expected.command]);
    }
    node.value.splice(index - 1, 2 + expectations.length * 2);
  }
  assert.equal(found, expectations.length ? 1 : 0, 'expected advice count');
  return copy;
}

export function replaceExpectedText(messages, from, to) {
  const copy = structuredClone(messages);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'MD.text' && value.value === from) value.value = to;
    else for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  };
  visit(copy);
  return copy;
}
