import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { resolve, sep } from 'node:path';
import ts from 'typescript';
import { Format, onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import { markdownButtonLabel } from '../../src/utils/buttonLabel';
import { createQuoteMarkdown, FormatGui } from '../../src/utils/messageHelper';

after(() => shutdownLogger());

test('所有源码 Markdown 按钮必须经统一标题函数，原生键盘单独识别', () => {
  const configPath = resolve('tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve('.'));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  let markdownCount = 0;
  let keyboardCount = 0;
  const missing: string[] = [];
  for (const source of program.getSourceFiles()) {
    if (source.isDeclarationFile || !resolve(source.fileName).startsWith(resolve('src') + sep)) continue;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'addButton') {
        const type = checker.typeToString(checker.getTypeAtLocation(node.expression.expression));
        const location = `${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
        if (type === 'FormatMarkDown') {
          markdownCount++;
          const title = node.arguments[0];
          if (!title || !ts.isCallExpression(title) || title.expression.getText(source) !== 'markdownButtonLabel') missing.push(location);
        } else if (type === 'FormatButtonGroup') {
          keyboardCount++;
        } else {
          missing.push(`${location}: 未审计的按钮类型 ${type}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.ok(markdownCount >= 199, `扫描到 ${markdownCount} 个 Markdown 按钮`);
  assert.ok(keyboardCount > 0);
  assert.deepEqual(missing, []);
});

test('服务端旧标题、无装饰标题和已转换标题在真实发送中保持统一，指令不变', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const labels = ['同意', '[同意]', '‹同意›', '[[同意]]', ' ‹[同意]› '];
  for (const label of labels) {
    const handler = onResponse(['private.message.create'], async () => {
      const [message] = useMessage();
      await message.send(FormatGui({
        isPrivate: true,
        header: [{ label, command: '/宗门审核' }],
        content: Format.createMarkdown().addBlockquote(createQuoteMarkdown(['申请者'], [{ label, command: '/宗门审核同意 1001829', autoEnter: true }])),
        footer: [{ label, command: '/我的灵田' }]
      }));
    });
    const result = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    for (const command of ['/宗门审核', '/宗门审核同意 1001829', '/我的灵田']) assert.ok(message.commands.includes(command));
    const rendered = message.nodes.flatMap(node => node.type === 'Markdown' ? [createMarkdownText(node.value)] : []).join('\n');
    assert.equal((rendered.match(/show="‹同意›"/g) ?? []).length, 3);
    assert.ok(rendered.includes('<qqbot-cmd-enter text="/宗门审核同意 1001829" show="‹同意›" />'));
    assert.doesNotMatch(rendered, /show="[^\"]*[\[\]]/);
  }
  assert.equal(markdownButtonLabel('材料[稀有]'), '‹材料‹稀有››');
});
