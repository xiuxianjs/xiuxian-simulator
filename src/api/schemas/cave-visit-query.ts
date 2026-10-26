import type { CaveOverviewQueryData } from './cave-overview-query';

/** Server-interpreted cave visit display and operation facts. */
export interface CaveVisitQueryData {
  ownerId: number;
  ownerName: string;
  relation: 'self' | 'companion' | 'friend' | 'stranger';
  relationLabel: string;
  canViewPlots: boolean;
  canCollaborate: boolean;
  canSteal: boolean;
  auraVisible: boolean;
  auraScore?: number;
  auraLabel: string;
  auraText: string;
  summaryText: string;
  stolenToday: boolean;
  stolenStatusText: string;
  capabilities: Array<{ kind: 'collaborate' | 'collaborateHarvest' | 'steal'; careAction?: 'water' | 'worm' | 'weed' }>;
  recentLogs: string[];
  summary?: CaveOverviewQueryData;
}
