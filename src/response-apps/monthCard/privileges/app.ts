import { getBackendVipPrivileges } from '@src/api/bot/vip-privileges-queries';
import { projectPrivilegesPanel, type PrivilegesResult } from '@src/api/bot/membership-panels';
export type { PrivilegesResult } from '@src/api/bot/membership-panels';
import { logger } from 'alemonjs';

export default async function App(params: { uid: number; avatarURL: string; bid?: string }): Promise<PrivilegesResult> {
  const { uid, avatarURL } = params;

  try {
    const data = await getBackendVipPrivileges(params.bid, uid);

    return projectPrivilegesPanel(data, avatarURL);
  } catch (error) {
    logger.error('我的特权查询失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
