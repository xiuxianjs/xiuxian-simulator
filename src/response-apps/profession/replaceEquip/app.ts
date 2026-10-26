import { getBackendProfessionToolBag } from '@src/api/bot';
import { BackendAPIError } from '@src/api/bot/client';
import { replaceBackendProfessionTool } from '@src/api/bot/profession-tool-replace';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';
import { parseProfessionToolCommand } from '@src/api/bot/profession-robot-tools';

export type ReplaceProfessionEquipResult =
  | {
      code: 'LIST';
      data: {
        tools: Array<{
          id: number;
          name: string;
          typeName: string;
          grade: string;
          isLocked: number;
        }>;
      };
    }
  | {
      code: 'OK';
      data: {
        message: string;
        equipment?: {
          name: string;
          gradeName: string;
          typeName: string;
        };
      };
    }
  | {
      code: 'FAILED';
      message: string;
      uid: number;
    }
  | {
      code: 'ERROR';
    };

export default async function App(params: {
  bid?: string;
  uid: number;
  messageText: string;
  request?: BackendRequestContext;
}): Promise<ReplaceProfessionEquipResult> {
  const identifier = parseProfessionToolCommand(params.messageText);

  try {
    if (!identifier) {
      const { items: tools } = await getBackendProfessionToolBag(params.bid, params.uid);

      return {
        code: 'LIST',
        data: {
          tools: tools
            // 是否可替换由 Go 背包投影统一判定，机器人只展示该能力。
            .filter(item => item.canReplace)
            .map(item => ({
              id: item.id,
              name: item.name,
              typeName: item.typeName,
              grade: item.grade,
              isLocked: item.isLocked
            }))
        }
      };
    }

    const result = await replaceBackendProfessionTool(params.bid, params.uid, identifier, params.request);

    return {
      code: 'OK',
      data: {
        message: result.message,
        equipment: {
          name: result.toolName,
          gradeName: result.gradeName,
          typeName: result.typeName
        }
      }
    };
  } catch (error) {
    logger.error('替换职业工具失败:', error);

    if (error instanceof BackendAPIError) {
      return { code: 'FAILED', message: error.message, uid: params.uid };
    }

    return { code: 'ERROR' };
  }
}
