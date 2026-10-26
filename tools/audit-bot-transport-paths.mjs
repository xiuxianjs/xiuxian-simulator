import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';

// Potential source call sites only. Branches, loops, retries and SDK internals
// require actual event traces; this inventory is not a message/request count.
const root = process.cwd();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : /\.[jt]sx?$/.test(file) ? [file] : [];
});
const files = walk(path.join(root, 'src'));
const sites = [];
const sources = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = new Map();
  const clients = new Set();
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
      imports.set(binding.name.text, { imported: binding.propertyName?.text ?? binding.name.text, from: node.moduleSpecifier.text });
    }
  }
  const collect = node => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
      const binding = ts.isIdentifier(node.initializer.expression) ? imports.get(node.initializer.expression.text) : undefined;
      if (binding?.imported === 'useMessage' && (binding.from === '@src/utils/useMessage' || path.resolve(path.dirname(file), binding.from) === path.join(root, 'src/utils/useMessage'))) {
        const first = node.name.elements[0];
        if (first && ts.isBindingElement(first) && ts.isIdentifier(first.name)) clients.add(first.name.text);
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(source);
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (['send', 'sendToTarget', 'sendToChannel', 'sendToUser', 'stream', 'edit'].includes(method)) {
        const receiver = node.expression.expression.getText(source);
        let coverage = 'requires-caller-review';
        if (clients.has(receiver) && method === 'send') coverage = 'shared-useMessage-wrapper';
        else if (file.endsWith('/utils/useMessage.ts') && receiver === 'message' && method === 'send') coverage = 'shared-wrapper-sdk-promise';
        else if (file.endsWith('/notification/channel.ts') && receiver === 'direct') coverage = 'notification-direct-sdk-promise';
        else if (receiver === 'notificationChannel' || receiver === 'channel') coverage = 'notification-channel-delegation';
        sites.push({ file: path.relative(root, file), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, receiver, method, coverage });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (sites.some(site => site.file === path.relative(root, file))) sources.push({ file: path.relative(root, file), sha256: crypto.createHash('sha256').update(text).digest('hex') });
}
const categories = Object.fromEntries([...new Set(sites.map(site => site.coverage))].map(category => [category, sites.filter(site => site.coverage === category).length]));
const result = { sourceFilesScanned: files.length, filesWithPotentialSendSites: sources.length, potentialSendSites: sites.length, categories, sites, sources,
  boundary: 'Source call-site inventory, not runtime sends. Lexical bindings classified conservatively; caller-review sites require manual review. SDK transport/platform queues, delivery and user display are outside source-site coverage.' };
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
else process.stdout.write(JSON.stringify(result, null, 2) + '\n');
