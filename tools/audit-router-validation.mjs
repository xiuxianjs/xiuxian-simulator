import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Active AST only. This reports framework schema gates, not runtime request
// counts or backend parity; unresolved definitions remain explicit.
const file = path.resolve('src/router.ts');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const property = (object, key) => object.properties.find(node => ts.isPropertyAssignment(node) && node.name.getText(source).replace(/^['"]|['"]$/g, '') === key)?.initializer;
const literal = node => node && ts.isStringLiteral(node) ? node.text : undefined;
const routes = [];
const unresolved = [];
function visit(node) {
  if (ts.isObjectLiteralExpression(node) && property(node, 'schema')) {
    const command = literal(property(node, 'path'));
    const schema = property(node, 'schema');
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    if (!command || !ts.isObjectLiteralExpression(schema)) unresolved.push({ line, reason: 'nonliteral route/schema' });
    else {
      const args = property(schema, 'args');
      if (args && !ts.isArrayLiteralExpression(args)) unresolved.push({ command, line, reason: 'nonliteral arguments' });
      else {
        const list = [];
        for (const arg of args?.elements ?? []) {
          if (!ts.isObjectLiteralExpression(arg)) { unresolved.push({ command, line, reason: 'nonliteral argument' }); continue; }
          const rules = property(arg, 'rules');
          if (rules && !ts.isArrayLiteralExpression(rules)) { unresolved.push({ command, line, reason: 'nonliteral rules' }); continue; }
          const ruleList = [];
          for (const rule of rules?.elements ?? []) {
            if (!ts.isObjectLiteralExpression(rule)) { unresolved.push({ command, line, reason: 'nonliteral rule' }); continue; }
            ruleList.push(Object.fromEntries(rule.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(source), p.initializer.getText(source)])));
          }
          list.push({ name: literal(property(arg, 'name')), rules: ruleList });
        }
        const rest = list.some(arg => arg.rules.some(rule => rule.type === "'rest'" || rule.type === '"rest"'));
        const constraints = list.flatMap(arg => arg.rules.filter(rule => Object.keys(rule).some(key => ['required', 'pattern', 'min', 'max', 'validator', 'enum'].includes(key)) || ['number', 'enum', 'range'].some(type => rule.type === `'${type}'` || rule.type === `"${type}"`)).map(rule => ({ argument: arg.name, rule })));
        routes.push({ command, line, maximumArgs: !rest && list.length ? list.length : null, constraints });
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);
const remaining = routes.filter(route => route.maximumArgs !== null || route.constraints.length);
process.stdout.write(JSON.stringify({ source: 'src/router.ts', schemas: routes.length, remainingSchemaGates: remaining.length, maximumArgumentGates: remaining.filter(r => r.maximumArgs !== null).length, valueRuleGates: remaining.filter(r => r.constraints.length).length, unresolved, routes: remaining }, null, 2) + '\n');
