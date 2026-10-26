import type { CompanionGiftOptionsQueryData, CompanionGiftTargetQueryData } from './companion-gift-preparation-query';
import type { CompanionGiftSettlement } from '../bot/companion-gift';

export interface CompanionGiftCommandInput {
  firstParam?: string;
  secondParam?: string;
  targetBid?: string;
  category?: string;
  view?: 'types';
  quantity?: number;
}
export interface CompanionGiftCommandData {
  mode: 'TYPES' | 'INVALID' | 'OPTIONS' | 'TARGETS' | 'GIFT';
  targetId: number;
  giftName: string;
  options: CompanionGiftOptionsQueryData | null;
  targets: CompanionGiftTargetQueryData | null;
  mutation: CompanionGiftSettlement | null;
  queryError?: string;
  mutationError?: string;
}
