/** Server-authoritative result of a completed companion gift. */
export interface CompanionGiftSettlement {
  success: boolean;
  message: string;
  giftName: string;
  targetName: string;
  reply: string;
  intimacyGained: number;
  tongxinGained: number;
  premium: boolean;
}
