import type { BackendRequestContext } from '@src/api/bot/context';
import { cancelBackendSoulWash } from '@src/api/bot/soul-wash-cancel';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }) {
  try {
    const result = await cancelBackendSoulWash(params.bid, params.uid, params.request);

    if (result.status === 'cancelled') {
      return { success: true, message: `已放弃 ${result.totalSuccess} 次洗涤结果，洗涤石不返还，当前本命物效果保持不变` };
    }

    return {
      success: false,
      message: result.status === 'no_pending' ? '当前没有待取消的本命物洗涤结果' : '操作繁忙，请稍后再试'
    };
  } catch (error) {
    logger.error('取消本命物洗涤失败:', error);

    return {
      success: false,
      message: error instanceof Error ? error.message : '取消本命物洗涤失败'
    };
  }
}
