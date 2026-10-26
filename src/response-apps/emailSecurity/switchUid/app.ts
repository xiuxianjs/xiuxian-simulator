import { switchBackendRole, type BackendRequestContext } from '@src/api';

type SwitchUidResult =
  | { code: 'FAIL'; data: { message: string } }
  | {
      code: 'OK';
      data: { fromUid: number; fromName: string; toUid: number; toName: string; cacheCleared: boolean };
    };

export function parseSwitchUid(messageText: string): number | null {
  const match = messageText.trim().match(/^(?:!|！|\/|#|＃)?切换UID\s+(\d+)$/);
  const uid = match ? Number(match[1]) : NaN;

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
}

/** 玩家直接交换平台账号绑定，所有按 UID 关联的存档和游戏状态随角色保留。 */
export default async function App(params: { bid: string; messageText: string; request?: BackendRequestContext }): Promise<SwitchUidResult> {
  const { bid, messageText, request } = params;

  const targetUid = parseSwitchUid(messageText);

  if (!targetUid) {
    return { code: 'FAIL', data: { message: '请输入有效的正整数 UID。\n指令格式：/切换UID 目标UID' } };
  }

  if (!request) {
    return { code: 'FAIL', data: { message: '当前平台消息缺少唯一标识，无法安全提交写操作' } };
  }

  try {
    const data = await switchBackendRole(bid, targetUid, request);

    return { code: 'OK', data };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '切换失败，未完成账号交换，请稍后再试。' } };
  }
}
