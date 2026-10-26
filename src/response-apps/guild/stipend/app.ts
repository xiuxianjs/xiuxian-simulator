import { postBackendGuildStipendClaim } from '@src/api/bot/guild-worship-stipend';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; repeatCommand?: string; request?: BackendRequestContext }): Promise<AppResult> {
  try {
    const result = await postBackendGuildStipendClaim(params.bid, params.uid, params.request, params.repeatCommand);
    const message =
      `你领取了本周俸禄【${result.amount}】灵石。` +
      `（基础${result.baseAmount} × 宗门${result.guildLevel}级${result.levelMultiplier.toFixed(1)}倍 × 活跃${result.activityMultiplier.toFixed(1)}倍）`;

    return { code: 'OK', data: { message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '领取俸禄失败' } };
  }
}
