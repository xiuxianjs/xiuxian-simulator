import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { gameExpose } from '../../src/expose';

const source = (path: string) => ts.createSourceFile(path, readFileSync(fileURLToPath(new URL(`../../src/expose/${path}`, import.meta.url)), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const index = source('index.ts');
const imports = new Map<string, string>();
for (const statement of index.statements) {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('./')) continue;
  const bindings = statement.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) continue;
  for (const item of bindings.elements) imports.set(item.name.text, `${statement.moduleSpecifier.text.slice(2)}.ts`);
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

test('所有 Expose 模块动作不发生同名覆盖，注册目录与源码一致', t => {
  assert.ok(actionObject);
  const seen = new Map<string, string>();
  function add(name: string, origin: string) {
    assert.equal(seen.has(name), false, `${name} 同时出现在 ${seen.get(name)} 和 ${origin}`);
    seen.set(name, origin);
  }
  for (const property of actionObject.properties) {
    if (ts.isSpreadAssignment(property)) {
      assert.ok(ts.isIdentifier(property.expression));
      const symbol = property.expression.text;
      const path = imports.get(symbol);
      assert.ok(path, `未找到 ${symbol} 导入`);
      const object = findObject(source(path), symbol);
      assert.ok(object, `未找到 ${symbol} 动作对象`);
      for (const entry of object.properties) {
        assert.ok(ts.isPropertyAssignment(entry) && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)), `${path} 含无法静态审计的动作`);
        add(entry.name.text, path);
      }
    } else {
      assert.ok(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)));
      add(property.name.text, 'index.ts');
    }
  }
  const configs = gameExpose.getConfigs();
  assert.equal(configs.length, 1);
  assert.deepEqual(Object.keys(configs[0].actions).sort(), [...seen.keys()].sort());
  t.diagnostic(`审计 ${seen.size} 个动作`);
});
