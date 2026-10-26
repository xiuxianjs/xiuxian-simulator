import { getBackendWudaoOptions, wudaoBackendSkillBook, type WudaoOption, type WudaoOptions, type WudaoResult } from '@src/api/bot/skill-book-wudao';
import type { BackendRequestContext } from '@src/api/bot/context';

export type AvailableAttr = { label: string; attr: string; isPercent: boolean; currentMaxText: string; templateMaxText: string };
type PrepareResult =
  | { code: 'OK'; data: { skillBookName: string; ownedQty: number; available: AvailableAttr[] } }
  | { code: 'NO_STONE' | 'NO_RECORD' | 'NO_ATTRS' | 'LOAD_FAILED'; data: { message: string; skillBookName?: string } };
type ExecuteResult =
  | {
      code: 'OK';
      data: { skillBookName: string; label: string; isPercent: boolean; growthText: string; newMaxText: string; templateMaxText: string; remaining: number };
    }
  | { code: 'FAIL' | 'LOAD_FAILED'; data: { message: string } };

function options(value: WudaoOption[]): AvailableAttr[] {
  return value.map(option => ({
    label: option.label,
    attr: option.key,
    isPercent: option.isPercent,
    currentMaxText: option.currentMaxText,
    templateMaxText: option.templateMaxText
  }));
}
export async function prepareWudao(params: { bid?: string; uid: number; userSkillBookId: number; prepared?: WudaoOptions }): Promise<PrepareResult> {
  try {
    const data = params.prepared ?? (await getBackendWudaoOptions(params.bid, params.uid, params.userSkillBookId));

    if (data.status === 'no_stone') {
      return { code: 'NO_STONE', data: { message: data.message } };
    }
    if (data.status === 'no_record') {
      return { code: 'NO_RECORD', data: { message: data.message } };
    }
    if (data.status === 'no_attrs') {
      return { code: 'NO_ATTRS', data: { message: data.message, skillBookName: data.skillBookName } };
    }
    const available = options(data.options);

    return { code: 'OK', data: { skillBookName: data.skillBookName, ownedQty: data.ownedStones, available } };
  } catch (error) {
    const message = error instanceof Error ? error.message : '悟道准备失败，请稍后再试或联系运营。';

    return { code: 'LOAD_FAILED', data: { message } };
  }
}
export async function executeWudao(params: {
  bid?: string;
  uid: number;
  userSkillBookId: number;
  attrKey: string;
  request?: BackendRequestContext;
  prepared?: WudaoResult;
  failure?: string;
}): Promise<ExecuteResult> {
  try {
    if (params.failure) {
      throw new Error(params.failure);
    }
    const data = params.prepared ?? (await wudaoBackendSkillBook(params.bid, params.uid, params.userSkillBookId, params.attrKey, params.request));

    return { code: 'OK', data };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '悟道失败，请稍后再试或联系运营。' } };
  }
}
