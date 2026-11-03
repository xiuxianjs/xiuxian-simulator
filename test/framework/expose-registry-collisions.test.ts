import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

const source = (path: string) => ts.createSourceFile(path, readFileSync(fileURLToPath(new URL(`../../src/expose/${path}`, import.meta.url)), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const index = source('index.ts');
function importedObject(path: string, localName: string) {
  const tree = source(path);
  const local = findObject(tree, localName);
  if (local) return { path, object: local };
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('.')) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const item = bindings.elements.find(item => item.name.text === localName);
    if (!item) continue;
    const target = join(dirname(path), `${statement.moduleSpecifier.text}.ts`);
    const object = findObject(source(target), item.propertyName?.text ?? item.name.text);
    assert.ok(object, `未找到 ${target} 的 ${localName} 动作对象`);
    return { path: target, object };
  }
  assert.fail(`未找到 ${path} 中的 ${localName}`);
}
function findObject(node: ts.Node, name: string): ts.ObjectLiteralExpression | undefined {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer && ts.isObjectLiteralExpression(node.initializer)) return node.initializer;
  return ts.forEachChild(node, child => findObject(child, name));
}
let actionObject: ts.ObjectLiteralExpression | undefined;
function findActions(node: ts.Node): void {
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'actions' && ts.isObjectLiteralExpression(node.initializer)) actionObject = node.initializer;
  ts.forEachChild(node, findActions);
}
findActions(index);

function auditActions(object: ts.ObjectLiteralExpression, path: string, seen = new Map<string, string>(), stack = new Set<string>()) {
  const identity = `${path}:${object.pos}`;
  assert.ok(!stack.has(identity), `${path} 动作集合循环展开`);
  stack.add(identity);
  for (const entry of object.properties) {
    if (ts.isSpreadAssignment(entry)) {
      assert.ok(ts.isIdentifier(entry.expression), `${path} 含无法静态审计的展开`);
      const imported = importedObject(path, entry.expression.text);
      auditActions(imported.object, imported.path, seen, stack);
    } else {
      assert.ok(ts.isPropertyAssignment(entry) && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)), `${path} 含无法静态审计的动作`);
      const name = entry.name.text;
      assert.equal(seen.has(name), false, `${name} 同时出现在 ${seen.get(name)} 和 ${path}`);
      seen.set(name, path);
    }
  }
  stack.delete(identity);
  return seen;
}

test('所有 Expose 模块动作不发生同名覆盖，注册目录与源码一致', t => {
  assert.ok(actionObject);
  const lifecycle = findObject(source('../agent-play/lifecycle.ts'), 'conversationLifecycle');
  assert.ok(lifecycle);
  const lifecycleActions = lifecycle.properties.find(entry => ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === 'actions');
  assert.ok(lifecycleActions && ts.isPropertyAssignment(lifecycleActions) && ts.isObjectLiteralExpression(lifecycleActions.initializer));
  const scheduled = findObject(source('scheduled-harvest.ts'), 'scheduledHarvest');
  assert.ok(scheduled);
  const scheduledActions = scheduled.properties.find(entry => ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === 'actions');
  assert.ok(scheduledActions && ts.isPropertyAssignment(scheduledActions) && ts.isObjectLiteralExpression(scheduledActions.initializer));
  const expected = new Map([
    [GAME_EXPOSE_PROTOCOL, auditActions(actionObject, 'index.ts')],
    ['agent.conversation.v1', auditActions(lifecycleActions.initializer, '../agent-play/lifecycle.ts')],
    ['agent.scheduled-action.v1', auditActions(scheduledActions.initializer, 'scheduled-harvest.ts')]
  ]);
  const configs = gameExpose.getConfigs();
  assert.deepEqual(configs.map(config => config.name).sort(), [...expected.keys()].sort());
  for (const config of configs) {
    const seen = expected.get(config.name)!;
    assert.deepEqual(Object.keys(config.actions).sort(), [...seen.keys()].sort());
    t.diagnostic(`审计 ${config.name} 的 ${seen.size} 个动作`);
  }
});

test('动作审计仍拒绝直接与展开后的同名覆盖', () => {
  const duplicate = ts.createSourceFile('fixture.ts', 'const value = { ...conversationRoutingActions, route_conversation: {} };', ts.ScriptTarget.Latest, true);
  assert.throws(() => auditActions(findObject(duplicate, 'value')!, 'guidance-flow.ts'), /route_conversation 同时出现在/);
});

test('常用玩法文档的每个动作都能从实际能力目录发现', t => {
  const readme = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8');
  const table = readme.split('常用玩法的查询与操作入口：')[1]?.split('每次写操作后')[0];
  assert.ok(table, '缺少常用玩法查询与操作表');
  const provider = gameExpose.getConfigs().find(config => config.name === GAME_EXPOSE_PROTOCOL);
  assert.ok(provider);
  const actions = provider.actions;
  const names = [...new Set([...table.matchAll(/`([a-z]+_[a-z_]+)`/g)].map(match => match[1]))];
  assert.ok(names.length > 0, '常用玩法表没有可审计的动作');
  for (const name of names) {
    const action = actions[name];
    assert.ok(action, `常用玩法文档引用未注册动作 ${name}`);
    assert.ok(action.description, `${name} 缺少调用说明`);
    assert.ok(action.inputSchema, `${name} 缺少输入契约`);
    assert.ok(action.outputSchema, `${name} 缺少输出契约`);
  }
  t.diagnostic(`核对常用玩法表的 ${names.length} 个动作`);
});
