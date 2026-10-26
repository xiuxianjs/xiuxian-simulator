export interface SoulWashCancelData {
  status: 'cancelled' | 'no_pending' | 'busy' | 'conflict';
  totalSuccess: number;
}
