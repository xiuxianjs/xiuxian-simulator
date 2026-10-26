import { parseProfessionToolBag } from './queries';
import { parseProfessionToolReplace } from './profession-tool-replace';

export function parseProfessionToolCommand(messageText: string) {
  return messageText
    .trim()
    .match(/^(!|！|\/|#|＃)?(替换|切换)(?:\s+(.+))?$/)?.[3]
    ?.trim();
}

export function parseProfessionRobotTools(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('天工业务结果不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.mode === 'list') {
    const bag = parseProfessionToolBag(row.bag);

    return {
      code: 'LIST' as const,
      data: {
        tools: bag.items
          .filter(item => item.canReplace)
          .map(item => ({ id: item.id, name: item.name, typeName: item.typeName, grade: item.grade, isLocked: item.isLocked }))
      }
    };
  }
  if (row.mode === 'replace') {
    const result = parseProfessionToolReplace(row.result);

    return {
      code: 'OK' as const,
      data: { message: result.message, equipment: { name: result.toolName, gradeName: result.gradeName, typeName: result.typeName } }
    };
  }
  throw new Error('天工业务分支无效');
}
