import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createHash } from 'node:crypto';

// Inventory only. Finding a handler or a recommendation hook is not proof that
// every refusal has been reviewed, delivered or given a correct next action.
const root = process.cwd();
const filename = 'src/router.ts';
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
const entries = [];
const registration = node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['use', 'res'].includes(node.expression.name.text);
const property = (node, name) => node.properties.find(child => ts.isPropertyAssignment(child) && child.name.getText(source).replace(/^['"]|['"]$/g, '') === name)?.initializer;
const commands = node => {
  if (!node) return [];
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(commands);
  if (ts.isObjectLiteralExpression(node)) return commands(property(node, 'path'));
  return [];
};
const handlerFacts = specifier => {
  const stem = specifier.startsWith('@src/') ? specifier.replace('@src/', 'src/') : specifier;
  const file = ['.ts', '.tsx', '/index.ts'].map(extension => stem + extension).find(candidate => fs.existsSync(candidate));
  if (!file) return { module: specifier, file: null, operations: [], dynamicOperations: [], status: 'unresolved-handler' };
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const operations = new Set();
  const dynamicOperations = new Set();
  const collect = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['runRobotBusiness', 'loadFinalBusiness', 'requestRobotBusiness'].includes(node.expression.text)) {
      const operation = node.arguments[node.expression.text === 'loadFinalBusiness' ? 2 : 1];
      if (operation && ts.isStringLiteralLike(operation)) operations.add(operation.text);
      else if (operation) dynamicOperations.add(operation.getText(ast));
    }
    ts.forEachChild(node, collect);
  };
  collect(ast);
  return { module: specifier, file, operations: [...operations], dynamicOperations: [...dynamicOperations], status: 'pending-branch-review' };
};
function visit(node) {
  if (registration(node)) {
    const handlers = new Set();
    const collect = child => {
      if (registration(child)) return;
      if (ts.isCallExpression(child) && child.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(child.arguments[0])) {
        handlers.add(child.arguments[0].text);
      }
      ts.forEachChild(child, collect);
    };
    // Do not attribute a group's nested route handlers to its parent group.
    for (const argument of node.arguments.slice(1)) collect(argument);
    const routeCommands = commands(node.arguments[0]);
    const groupOnly = node.arguments.length === 1 && (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]));
    if (!groupOnly) entries.push({
      line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      registration: node.expression.name.text,
      route: routeCommands.length ? routeCommands : node.arguments[0]?.getText(source) ?? '',
      routeResolution: routeCommands.length ? 'literal' : 'needs-review',
      handlers: [...handlers].map(handlerFacts),
      review: 'pending',
      verifiedBranches: []
    });
  }
  ts.forEachChild(node, visit);
}
visit(source);
const report = {
  source: filename,
  sourceSha256: createHash('sha256').update(source.text).digest('hex'),
  scope: 'All active use/res registration syntax in src/router.ts; imported route tables, inherited prefixes, regex matches and dynamic operations require separate review.',
  completionRule: 'Each command requires authoritative refusal branches, specific next actions, resolvable commands and real framework delivery assertions. Static inventory never marks completion.',
  summary: {
    registrations: entries.length,
    literalRegistrations: entries.filter(entry => entry.routeResolution === 'literal').length,
    unresolvedRegistrations: entries.filter(entry => entry.routeResolution !== 'literal' || !entry.handlers.length).length,
    handlerFiles: new Set(entries.flatMap(entry => entry.handlers.map(handler => handler.file).filter(Boolean))).size,
    reviewedCommands: 0
  },
  entries
};
const output = process.argv.find(value => value.startsWith('--output='))?.slice('--output='.length);
if (output) {
  const target = path.resolve(root, output);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report.summary) + '\n');
} else process.stdout.write(JSON.stringify(report, null, 2) + '\n');
