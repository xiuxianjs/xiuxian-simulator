import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Conservative import-graph audit. It inventories potential call sites, not
// runtime HTTP counts: branches, retries, loops and imported unused functions
// require event traces to establish the requests actually made.
const root = process.cwd();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
});
const files = walk(path.join(root, 'src'));
const known = new Set(files);
const relative = file => path.relative(root, file).replaceAll(path.sep, '/');
const resolve = (file, specifier) => {
  if (!specifier.startsWith('.') && !specifier.startsWith('@src/')) return null;
  const base = specifier.startsWith('@src/') ? path.join(root, 'src', specifier.slice(5)) : path.resolve(path.dirname(file), specifier);
  const stem = base.replace(/\.[cm]?jsx?$/, '');
  return [base, ...['.ts', '.tsx', '.js', '/index.ts', '/index.tsx'].map(ext => stem + ext)].find(candidate => known.has(candidate)) ?? null;
};
const modules = new Map();
const sites = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = new Set();
  const requests = [];
  const hints = new Set();
  const literals = (node, seen = new Set()) => {
    if (!node || seen.has(node)) return [];
    seen.add(node);
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue, seen), ...literals(node.whenFalse, seen)];
    if (ts.isLiteralTypeNode(node)) return literals(node.literal, seen);
    if (ts.isUnionTypeNode(node)) return node.types.flatMap(type => literals(type, seen));
    if (ts.isIdentifier(node)) {
      for (let scope = node.parent; scope; scope = scope.parent) {
        if (!ts.isBlock(scope) && !ts.isSourceFile(scope) && !ts.isFunctionLike(scope)) continue;
        const declarations = [];
        const collect = child => {
          if ((ts.isVariableDeclaration(child) || ts.isParameter(child)) && ts.isIdentifier(child.name) && child.name.text === node.text) declarations.push(child);
          if (child !== scope && (ts.isFunctionLike(child) || ts.isBlock(child))) return;
          ts.forEachChild(child, collect);
        };
        collect(scope);
        if (declarations.length) return declarations.flatMap(declaration => literals(ts.isVariableDeclaration(declaration) ? declaration.initializer : declaration.type, seen));
      }
    }
    return [];
  };
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const target = resolve(file, node.moduleSpecifier.text);
      if (target) imports.add(target);
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(source);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(node.arguments[0])) {
        const target = resolve(file, node.arguments[0].text);
        if (target) imports.add(target);
      }
      if (expression === 'requestBackend') {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        const id = `${relative(file)}:${line + 1}`;
        sites.push({ id, operationIds: literals(node.arguments[1]), unresolvedExpression: literals(node.arguments[1]).length ? null : node.arguments[1]?.getText(source) ?? null });
        requests.push(id);
      }
      if (expression === 'Promise.all' || expression === 'Promise.allSettled') hints.add('parallel-call-site');
      if (expression === 'measureTransportStage') hints.add('transport-stage-timing');
      if (expression === 'axios.create' || expression === 'fetch' || expression.endsWith('.send')) hints.add(expression);
    }
    if (ts.isCatchClause(node)) hints.add('catch-path-review');
    ts.forEachChild(node, visit);
  };
  visit(source);
  modules.set(file, { file: relative(file), imports: [...imports], requests, hints: [...hints] });
}
const roots = files.filter(file => /\/src\/response(?:-apps)?\//.test(file) || file.endsWith('/src/router.ts'));
const entries = roots.map(file => {
  const visited = new Set();
  const pending = [file];
  while (pending.length) {
    const next = pending.pop();
    if (visited.has(next)) continue;
    visited.add(next);
    pending.push(...(modules.get(next)?.imports ?? []));
  }
  return { file: relative(file), potentialRequestSites: [...new Set([...visited].flatMap(item => modules.get(item)?.requests ?? []))].sort(), runtimeRequestCount: null };
});
const scope = [...modules.values()].filter(module => /^src\/(response\/|response-apps\/|api\/bot\/)/.test(module.file) || module.file === 'src/router.ts');
const result = {
  schemaVersion: 1,
  interpretation: 'All source units in response, response-apps and api/bot are inventoried. Import reachability is a conservative overapproximation, NOT an executed function graph or a per-command HTTP count. Dynamic expressions remain explicit. Conditions, catches, loops and reexports need runtime traces. No credentials or config contents are read.',
  summary: { sourceUnits: scope.length, responseUnits: scope.filter(item => item.file.startsWith('src/response/')).length, responseAppUnits: scope.filter(item => item.file.startsWith('src/response-apps/')).length, botAPIUnits: scope.filter(item => item.file.startsWith('src/api/bot/')).length, entryUnits: entries.length, requestSites: sites.length, unresolvedRequestSites: sites.filter(site => site.unresolvedExpression !== null).length },
  callSites: sites,
  modules: scope.map(module => ({ ...module, imports: module.imports.map(relative) })),
  entries
};
const output = process.argv[2];
if (!output) throw new Error('Usage: node tools/audit-bot-request-paths.mjs <output.json>');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result.summary) + '\n');
