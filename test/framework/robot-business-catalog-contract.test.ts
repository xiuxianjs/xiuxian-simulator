import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { robotBusinessV1Operations, robotBusinessV2Operations } from '../../src/api/domains/auth/business-operations';

test('机器人业务注册表、OpenAPI 和 SDK 枚举保持一致', () => {
  const root = fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url));
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestTianshuEveryRobotActionHasDeclaredModule$', '-v', '-count=1'], { cwd: root, encoding: 'utf8' }).toString();
  const match = output.match(/ROBOT_OPERATION_CATALOG=([^\n]+)/);
  assert.ok(match);
  const actual = match[1].split(',').sort();
  const doc = parse(readFileSync(new URL('../../../xiuxian-game-server/docs/openapi.yaml', import.meta.url), 'utf8'));
  const operations = Object.values(doc.paths as Record<string, any>).flatMap(path => Object.values(path as Record<string, any>)) as any[];
  for (const [name, sdk] of [['post_robot_business_operation', robotBusinessV1Operations], ['post_v2_robot_business_operation', robotBusinessV2Operations]] as const) {
    const operation = operations.find(row => row?.operationId === name);
    assert.ok(operation);
    const documented = operation.parameters.find((p: any) => p.name === 'operation').schema.enum as string[];
    assert.deepEqual([...documented].sort(), actual);
    assert.deepEqual([...sdk].sort(), actual);
  }
});
