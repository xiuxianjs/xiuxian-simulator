import { parseProfessionToolBag } from './queries';
import { parseProfessionToolReplace } from './profession-tool-replace';

export function parseProfessionToolCommand(messageText: string) {
  return messageText
    .trim()
    .match(/^(!|！|\/|#|＃)?(替换|切换)(?:\s+(.+))?$/)?.[3]
    ?.trim();
}

export function professionToolSwitchInput(messageText: string) {
  const identifier = parseProfessionToolCommand(messageText) ?? null;
  const list = identifier?.match(/^列表\s+([1-9]\d{0,8})(?:\s+(.+))?$/);

  return list ? { identifier: null, page: Number(list[1]), ...(list[2] ? { typeName: list[2] } : {}) } : { identifier };
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
        types: bag.types,
        activeType: bag.activeType,
        page: bag.page,
        totalPages: bag.totalPages,
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
