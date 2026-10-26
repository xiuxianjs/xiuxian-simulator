import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type ProfessionToolReplaceData = {
  toolId: number;
  userToolId: number;
  toolName: string;
  typeName: string;
  gradeName: string;
  gradeLevel: number;
  message: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('替换职业工具响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, minimum = Number.MIN_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error('替换职业工具响应不完整');
  }

  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('替换职业工具响应不完整');
  }

  return value;
}

export async function replaceBackendProfessionTool(
  bid: string | undefined,
  uid: number,
  identifier: string,
  request?: BackendRequestContext
): Promise<ProfessionToolReplaceData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseProfessionToolReplace(
    await requestBackend(bid, 'post_players_id_profession_tools_replace', {
      path: { id: uid },
      body: { identifier },
      headers: repeatPresentationHeaders('切换天工'),
      ...writeContext(request)
    })
  );
}

export function parseProfessionToolReplace(value: unknown): ProfessionToolReplaceData {
  const data = record(value);

  return {
    toolId: integer(data.toolId, 1),
    userToolId: integer(data.userToolId, 1),
    toolName: text(data.toolName),
    typeName: text(data.typeName),
    gradeName: text(data.gradeName),
    gradeLevel: integer(data.gradeLevel),
    message: text(data.message)
  };
}
