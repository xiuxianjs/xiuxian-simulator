import { getBackendSocialAccess } from '@src/api/bot/queries';

export function canAccessFifthLayerFeature(uid: number, bid: string) {
  return getBackendSocialAccess(bid, uid);
}

export { sendFifthLayerLockedPage } from './fifthLayerView';
