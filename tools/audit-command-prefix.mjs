import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Audit every concrete Markdown input / native keyboard constructor, including
// renderers that do not use FormatGui or the normal message sender.
const files = execFileSync('rg', ['--files', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(file => /\.tsx?$/.test(file));
const failures = [];
let commands = 0;
let links = 0;
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const property = (node, name) => node?.properties?.find(item => ts.isPropertyAssignment(item) && item.name.getText(source) === name)?.initializer;
  const formatted = node => node && (
    (ts.isCallExpression(node) && node.expression.getText(source) === 'commandText') ||
    (ts.isConditionalExpression(node) && formatted(node.whenFalse))
  );
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'addButton') {
      const arg = node.arguments[1];
      const data = arg && ts.isObjectLiteralExpression(arg) ? property(arg, 'data') : arg;
      const type = property(arg && ts.isObjectLiteralExpression(arg) ? arg : node.arguments[2], 'type');
      if (type && ts.isStringLiteral(type) && type.text === 'link') {
        links++;
      } else {
        commands++;
        if (!formatted(data)) failures.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (failures.length) throw new Error(`Unformatted button/input commands:\n${failures.join('\n')}`);
console.log(`Command prefix audit: ${commands} command constructors, ${links} links, ${files.length} source files; no uncovered addButton calls.`);
