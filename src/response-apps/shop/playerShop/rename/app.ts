import { renameBackendPlayerShop } from '@src/api/bot/player-shop-rename';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type ShopRenameResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  newName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<ShopRenameResult> {
  try {
    const res = await renameBackendPlayerShop(params.bid, params.uid, params.newName, params.request, params.messageText);
    const messages = {
      empty: '店铺名称不能为空',
      too_short: '店铺名称至少2个字',
      too_long: '店铺名称最多12个字',
      invalid_characters: '店铺名称不能包含特殊字符',
      name_taken: '该店名已被使用，请换一个'
    };
    const message = res.outcome === 'renamed' ? `店铺已更名为「${res.name}」` : messages[res.outcome];

    return { code: 'OK', data: { message } };
  } catch (error) {
    logger.error('命名店铺失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '命名失败，请稍后再试' } };
  }
}
