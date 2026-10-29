import { UNKNOWN_BATTLE_RESULT } from '../api/bot/battle-request';
import { SDKError } from '../api/core/error';

// Exact, reviewed availability reasons only. Arbitrary 503 diagnostics may
// contain SQL, credentials or infrastructure details and must remain private.
const publicAvailabilityReasons = new Set([
  '宝物系统数据结构尚未升级，请先执行宝物系统迁移',
  '宝物旧规则账户尚未完成迁移，请先核对旧计数与资产，未自动重置保底',
  '灵脉租契数据结构尚未升级，请执行宝物系统迁移',
  '灵脉租契配置与当前30元／30日规则不符，请联系管理员核对',
  '每日宝物礼包尚未执行v3数据迁移',
  '藏宝图映射缺失、重复或绑定配置有误，请管理员核对',
  '每日宝物礼包配置与已定商品权益不符',
  '礼包道具配置损坏',
  '礼包藏宝图数量或编号配置不符',
  '周活藏宝图尚未完成数据迁移，原箱奖励可正常领取',
  '周活藏宝图配置须有且仅有五个启用的原积分门槛，请先核对配置',
  '周活藏宝图物品映射尚未配置',
  '周活藏宝图加赠行配置异常，请核对每档唯一物品和2／3／5／5／5数量',
  '周活藏宝图加赠行未完整初始化，请先执行配置初始化',
  '周活藏宝图上线周尚未配置',
  '周活藏宝图上线周配置无效'
]);

/** Only business rejections may expose backend text in a player reply. */
export function getCommandErrorMessage(error: unknown): string {
  if (
    error instanceof SDKError &&
    ['SDK_TIMEOUT', 'SDK_NETWORK_ERROR', 'SDK_ABORTED', 'SDK_INVALID_RESPONSE'].includes(error.code) &&
    error.message === UNKNOWN_BATTLE_RESULT
  ) {
    return UNKNOWN_BATTLE_RESULT;
  }
  // This known availability reason is safe player-facing text. Keep the
  // exact legacy 503 wording during backend/client deployment overlap.
  if (
    error instanceof SDKError &&
    error.status === 503 &&
    (error.code === 'TRIBULATION_EVENTS_DISABLED' || (error.code === 'SERVICE_UNAVAILABLE' && error.message === '新渡劫事件与观望尚未开放'))
  ) {
    return '新渡劫尚未开放，暂时无法查询劫云。';
  }

  return getCommandBusinessErrorMessage(error) ?? '服务暂时不可用，请稍后再试';
}

/** Undefined means the caller must keep its transport/internal error handling. */
export function getCommandBusinessErrorMessage(error: unknown): string | undefined {
  if (error instanceof SDKError && error.status === 503 && error.code === 'SERVICE_UNAVAILABLE' && publicAvailabilityReasons.has(error.message)) {
    return error.message;
  }
  if (
    error instanceof SDKError &&
    [400, 403, 404, 409, 422].includes(error.status ?? 0) &&
    !error.code.startsWith('SDK_') &&
    !['INTERNAL', 'UNAUTHORIZED', 'UNAVAILABLE'].includes(error.code) &&
    error.message.trim()
  ) {
    return error.message;
  }

  return undefined;
}
