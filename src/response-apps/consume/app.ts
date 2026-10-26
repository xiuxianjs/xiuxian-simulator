import { consumeInputProblem } from '@src/response/consumeArguments';
import { CONFIRM_KEYWORD, EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from '@src/constants';
import { refineBackendSoulArtifact } from '@src/api/bot/soul-artifact-commands';
import type { BackendRequestContext } from '@src/api/bot/context';
import { consumeBackendItem, parseMingwuSelection, parsePeiyuanPending, type BackendMingwuSelection, type BackendPeiyuanPending } from '@src/api/bot/consume';

type Result =
  | {
      code: 'SOUL_ARTIFACT_EQUIP';
      data: { success: boolean; message: string };
    }
  | {
      code: 'SOUL_ARTIFACT_NEED_CONFIRM';
      data: { message: string; targetInstanceId: number };
    }
  | {
      code: 'STORAGE_NOT_FOUND';
      data: { message: string };
    }
  | {
      code: 'MISSING_PARAM';
      data: { message: string };
    }
  | {
      code: 'NUMERIC_NOT_ALLOWED';
      data: { message: string };
    }
  | {
      code: 'INVALID_QUANTITY';
      data: { message: string };
    }
  | {
      code: 'FAIL';
      data: { message: string };
    }
  | {
      code: 'PENDING_PEIYUAN';
      data: BackendPeiyuanPending;
    }
  | {
      code: 'PENDING_MINGWU';
      data: any;
    }
  | {
      code: 'PENDING_MINGWU_SELECT';
      data: BackendMingwuSelection;
    }
  | {
      code: 'OK';
      data: { message: string; remainingQuantity?: number };
    }
  | {
      code: 'ERROR';
      data: { message: string };
    };

export default async function App(params: {
  consume?: () => ReturnType<typeof consumeBackendItem>;
  refine?: () => ReturnType<typeof refineBackendSoulArtifact>;
  bid?: string;
  uid: number;
  rawText: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  const { bid, uid, rawText, request } = params;

  try {
    const problem = consumeInputProblem(rawText);

    if (problem) {
      return { code: 'FAIL', data: { message: problem } };
    }
    const isLianhua = /^(!|！|\/|#|＃)?炼化/.test(rawText);
    const messageText = rawText.replace(/^(!|！|\/|#|＃)?(消耗|服用|学习丹方|炼化)\s*/, EMPTY_STRING).trim();
    const args = messageText ? messageText.split(/\s+/) : [];
    const itemIdOrName = args[FIRST_ARG_INDEX];
    const confirmArg = args[SECOND_ARG_INDEX];
    const forceEquip = confirmArg === CONFIRM_KEYWORD;

    // /炼化 + 数字ID → 先检查本命物，再检查储物袋
    if (isLianhua && itemIdOrName && /^\d+$/.test(itemIdOrName)) {
      const numericId = Number(itemIdOrName);

      const command = params.refine ? await params.refine() : await refineBackendSoulArtifact(bid, uid, numericId, forceEquip, request, rawText);
      const preview = command.preview;

      if (preview.found) {
        if (!forceEquip && preview.needsConfirmation && preview.current && preview.target) {
          const message = [
            '检测到当前已炼化本命物，是否替换？',
            '',
            `当前：【${preview.current.name}】【${preview.currentGradeName}】`,
            `待炼化：【${preview.target.name}】【${preview.targetGradeName}】`,
            preview.comparisonLines.length > 0 ? `\n面板对比:\n${preview.comparisonLines.map(line => `- ${line}`).join('\n')}` : '',
            `\n${preview.refundLine}`
          ].join('');

          return { code: 'SOUL_ARTIFACT_NEED_CONFIRM', data: { message, targetInstanceId: preview.target.instanceId } };
        }

        const equipResult = command.equipped;

        if (!equipResult) {
          throw new Error('炼化本命物响应不完整');
        }
        const lines = [`成功炼化本命物「${equipResult.artifact.name}」`];

        if (equipResult.separated?.name) {
          const refundInfo =
            equipResult.separated.refundQuantity > 0
              ? `（Lv.${equipResult.separated.previousLevel}已重置，退还筑灵石×${equipResult.separated.refundQuantity}）`
              : '';

          lines.push(`原本命物「${equipResult.separated.name}」已自动分离${refundInfo}`);
        }

        return {
          code: 'SOUL_ARTIFACT_EQUIP',
          data: {
            success: true,
            message: lines.join('\n') + command.repeatSuffix
          }
        };
      }

      const generic = command.consumed;

      if (!generic) {
        throw new Error('消耗道具响应不完整');
      }

      if (generic.outcome === 'peiyuan_pending') {
        return { code: 'PENDING_PEIYUAN', data: parsePeiyuanPending(generic.pending) };
      }
      if (generic.outcome === 'mingwu_select') {
        return { code: 'PENDING_MINGWU_SELECT', data: parseMingwuSelection(generic.pending) };
      }
      if (generic.outcome === 'rejected') {
        return { code: 'FAIL', data: { message: generic.message } };
      }

      return { code: 'OK', data: { message: generic.message, remainingQuantity: generic.remainingQuantity } };
    }

    if (!itemIdOrName || itemIdOrName === EMPTY_STRING) {
      return {
        code: 'MISSING_PARAM',
        data: { message: '参数错误' }
      };
    }

    if (!isLianhua && /^\d+$/.test(itemIdOrName)) {
      return {
        code: 'NUMERIC_NOT_ALLOWED',
        data: { message: '请输入物品名称' }
      };
    }

    const quantityStr = args[FIRST_ARG_INDEX + 1];
    let quantity = 1;

    if (quantityStr) {
      quantity = parseInt(quantityStr, 10);

      if (isNaN(quantity) || quantity < 1) {
        return {
          code: 'INVALID_QUANTITY',
          data: { message: '数量必须是大于0的整数' }
        };
      }
    }

    const result = params.consume ? await params.consume() : await consumeBackendItem(bid, uid, { itemName: itemIdOrName, quantity }, request, rawText);

    if (result.outcome === 'peiyuan_pending') {
      return { code: 'PENDING_PEIYUAN', data: parsePeiyuanPending(result.pending) };
    }
    if (result.outcome === 'mingwu_select') {
      return { code: 'PENDING_MINGWU_SELECT', data: parseMingwuSelection(result.pending) };
    }
    if (result.outcome === 'rejected') {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return { code: 'OK', data: { message: result.message, remainingQuantity: result.remainingQuantity } };
  } catch (error: any) {
    return {
      code: 'ERROR',
      data: {
        message: error?.message ?? '消耗道具失败，请稍后再试或联系运营。'
      }
    };
  }
}
