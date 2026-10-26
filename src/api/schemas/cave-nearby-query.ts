export interface CaveNearbyPlayerQueryData {
  ownerId: number;
  ownerName: string;
  relation: 'self' | 'companion' | 'friend' | 'stranger';
  relationLabel: string;
  auraText: string;
  stolenStatusText: string;
  canSteal: boolean;
}

/** Server-interpreted /附近灵田 rows. The bot only lays out these facts. */
export interface CaveNearbyQueryData {
  players: CaveNearbyPlayerQueryData[];
  message?: string | null;
}
