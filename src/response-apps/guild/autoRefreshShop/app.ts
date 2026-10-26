/**
 * 宗门商店自动刷新设置 App 层
 * 客户端解析设置内容，服务保存配置与索引
 */

import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';
import { formatGuildShopAutoRefreshHours, parseAutoRefreshHours } from './view';

type AppResult =
  | { code: 'OK'; data: { message: string; autoRefreshEnabled: boolean; autoRefreshHours: number[]; isLeader: boolean } }
  | { code: 'FAIL'; data: { message: string; isLeader: boolean } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

/**
 * 设置宗门商店自动刷新
 * @param params.uid 用户ID（user表中的id）
 * @param params.param 参数：数字（0-23）设置刷新时间，"开启"启用自动刷新，"关闭"禁用自动刷新
 */
export default async function App(params: { bid?: string; uid: number; param: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const param = params.param.trim();
    const hours = parseAutoRefreshHours(param);
    const mode = hours ? 'hours' : param === '开启' ? 'enable' : param === '关闭' ? 'disable' : 'invalid';
    const result = await requestGuildWorkflow(params.bid, params.uid, { action: 'auto_refresh', mode, ...(hours ? { hours } : {}) }, params.request);
    const outcomeMessage = {
      not_joined: MSG_GUILD.NOT_JOINED,
      denied: MSG_GUILD.ONLY_LEADER,
      shop_missing: MSG_GUILD.SHOP_NOT_OPEN,
      hours_required: '请先设置1-3个自动刷新整点，再开启自动刷新',
      invalid_parameter: '参数无效，请输入1-3个整点小时，或输入“开启”“关闭”'
    };

    if (result.outcome !== 'updated') {
      return { code: 'FAIL', data: { message: outcomeMessage[result.outcome as keyof typeof outcomeMessage], isLeader: result.isLeader } };
    }
    const statusText = result.enabled ? `已开启，${formatGuildShopAutoRefreshHours(result.hours)}自动刷新` : '已关闭';

    return {
      code: 'OK',
      data: { message: `商店自动刷新设置成功：${statusText}`, autoRefreshEnabled: result.enabled, autoRefreshHours: result.hours, isLeader: result.isLeader }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '设置自动刷新失败' } };
  }
}
